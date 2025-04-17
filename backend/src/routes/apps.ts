import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { WalletService } from "../nwc/WalletService"; // Adjust path as needed
import { PrismaClient } from "@prisma/client"; // Import Prisma Client
import { SparkLNBackend } from "../ln/SparkLNBackend"; // Import SparkLNBackend

// Removed old App interface definition (Prisma model will be used)
// Removed in-memory userApps store

// Define the expected options structure passed during registration
interface AppRoutesOptions extends FastifyPluginOptions {
  walletService: WalletService;
  prisma: PrismaClient; // Add prisma
  lnBackendCache: Map<number, SparkLNBackend>; // Add cache
}

// Removed AuthenticatedUserWithBackend interface

// Define the structure of the user object attached by fastify-jwt (using userId)
interface AuthenticatedUser {
  userId: number; // Expect userId from JWT
  // Add other JWT payload fields if necessary
}

async function appRoutes(
  fastify: FastifyInstance,
  options: AppRoutesOptions // Use updated options type
) {
  // Define the expected body structure for creating an app
  interface CreateAppBody {
    name: string;
  }

  // Apply authentication hook to all routes in this plugin
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    }
  );

  // Route to create a new app for the authenticated user
  fastify.post<{ Body: CreateAppBody }>( // Specify body type
    "/",
    async (
      request: FastifyRequest<{ Body: CreateAppBody }>,
      reply: FastifyReply
    ) => {
      const jwtUser = request.user as AuthenticatedUser; // User from JWT payload (contains userId)
      const userId = jwtUser.userId;
      const { name } = request.body; // Get name from request body

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.code(400).send({
          message: "App name is required and must be a non-empty string.",
        });
      }

      // --- Retrieve User's Backend from Cache ---
      const userLnBackend = options.lnBackendCache.get(userId);

      if (!userLnBackend) {
        // This shouldn't happen if signup/startup logic is correct, but handle defensively
        fastify.log.error(
          `Could not find cached LN backend for user ID ${userId}`
        );
        return reply
          .code(500)
          .send({ message: "Internal server error: User session invalid." });
      }

      try {
        // --- Key Generation Logic ---
        const walletServiceSecretKey = bytesToHex(generateSecretKey());
        const walletServicePubkey = getPublicKey(
          hexToBytes(walletServiceSecretKey)
        );

        const clientSecretKey = bytesToHex(generateSecretKey()); // Secret for the client to connect
        const clientPubkey = getPublicKey(hexToBytes(clientSecretKey));
        const relayUrl = "wss://relay.getalby.com/v1"; // TODO: Make configurable?
        // Construct NWC URL for the response (not stored in DB anymore)
        const nwcUrl = `nostr+walletconnect://${walletServicePubkey}?relay=${relayUrl}&secret=${clientSecretKey}`;

        // --- Store App Data in Database ---
        const newApp = await options.prisma.app.create({
          data: {
            name: name.trim(),
            clientPubkey,
            walletServiceSecretKey, // Store the service's secret key for this app connection
            userId: userId, // Link to the user
          },
        });

        fastify.log.info(
          `Created new app '${newApp.name}' (ID: ${newApp.id}) for user ${userId} with client pubkey ${clientPubkey}`
        );

        // --- Trigger WalletService subscription ---
        await options.walletService.subscribe(
          newApp.clientPubkey,
          newApp.walletServiceSecretKey,
          userLnBackend, // Pass the cached backend instance
          userId, // Pass user ID
          newApp.id, // Pass the newly created app ID
          options.prisma // Pass prisma instance
        );
        fastify.log.info(
          `Successfully subscribed NWC listener for new app ${newApp.clientPubkey}`
        );

        // Return the relevant details of the created app
        return reply.code(201).send({
          name: newApp.name,
          pubkey: newApp.clientPubkey, // Use 'pubkey' to match frontend expectation
          nwcUrl: nwcUrl, // Return the generated URL
        });
      } catch (error) {
        // Catch potential errors from DB creation or subscription
        fastify.log.error(
          error,
          `Failed to create app or subscribe NWC listener for user ${userId}`
        );
        // TODO: Consider if the app record should be deleted if subscription fails
        return reply
          .code(500)
          .send({ message: "Internal Server Error during app creation." });
      }
    }
  );

  // Route to list apps for the authenticated user
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthenticatedUser; // Contains userId
    const userId = user.userId;

    try {
      const appsForUser = await options.prisma.app.findMany({
        where: { userId: userId },
        select: {
          // Select only needed fields
          name: true,
          clientPubkey: true,
        },
        orderBy: {
          createdAt: "desc", // Optional: order by creation date
        },
      });

      // Map to the expected frontend format
      const appListData = appsForUser.map((app: { name: string; clientPubkey: string }) => ({
        name: app.name,
        pubkey: app.clientPubkey,
      }));

      return reply.send(appListData);
    } catch (error) {
      fastify.log.error(error, `Failed to list apps for user ${userId}`);
      return reply
        .code(500)
        .send({ message: "Internal Server Error listing apps." });
    }
  });

  // TODO: Add routes for deleting apps, etc.
}

export default appRoutes;
