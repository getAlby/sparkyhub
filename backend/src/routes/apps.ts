import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { WalletService } from "../nwc/WalletService"; // Adjust path as needed

// Define the structure for an App
interface App {
  name: string; // Added name field
  clientPubkey: string;
  walletServiceSecretKey: string; // Secret key for the service side connection for this app
  createdAt: Date;
  nwcUrl: string; // Store the generated URL for reference
}

// In-memory store for apps per user (replace with a database in production)
// Maps username (from JWT) to an array of Apps
const userApps: Record<string, App[]> = {};

import { LNBackend } from "../ln/LNBackend"; // Import LNBackend type

// Define the expected options structure passed during registration
interface AppRoutesOptions extends FastifyPluginOptions {
  walletService: WalletService;
  lnBackend: LNBackend; // Add lnBackend to options
}

// Define the structure of the user object attached by fastify-jwt
interface AuthenticatedUser {
  username: string;
  // Add other JWT payload fields if necessary
}

async function appRoutes(fastify: FastifyInstance, options: AppRoutesOptions) {
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
      const user = request.user as AuthenticatedUser; // Type assertion after jwtVerify
      const username = user.username;
      const { name } = request.body; // Get name from request body

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply
          .code(400)
          .send({
            message: "App name is required and must be a non-empty string.",
          });
      }

      // --- Key Generation Logic ---
      // TODO: Use a persistent service key or generate one per app? For now, generate per app.
      const walletServiceSecretKey = bytesToHex(generateSecretKey());
      const walletServicePubkey = getPublicKey(
        hexToBytes(walletServiceSecretKey)
      );

      const clientSecretKey = bytesToHex(generateSecretKey());
      const clientPubkey = getPublicKey(hexToBytes(clientSecretKey));
      const relayUrl = "wss://relay.getalby.com/v1"; // TODO: Make configurable?
      const nwcUrl = `nostr+walletconnect://${walletServicePubkey}?relay=${relayUrl}&secret=${clientSecretKey}`;

      // --- Store App Data ---
      const newApp: App = {
        name: name.trim(), // Store the provided name (now correctly defined)
        clientPubkey,
        walletServiceSecretKey, // Store the secret needed for the service to connect
        createdAt: new Date(),
        nwcUrl,
      };

      if (!userApps[username]) {
        userApps[username] = [];
      }
      userApps[username].push(newApp);

      fastify.log.info(
        `Created new app for user ${username} with client pubkey ${clientPubkey}`
      );

      // --- Trigger WalletService subscription ---
      try {
        await options.walletService.subscribe(
          newApp.clientPubkey,
          newApp.walletServiceSecretKey,
          options.lnBackend // Pass the LN backend instance
        );
        fastify.log.info(
          `Successfully subscribed NWC listener for new app ${newApp.clientPubkey}`
        );
      } catch (error) {
        fastify.log.error(
          error,
          `Failed to subscribe NWC listener for new app ${newApp.clientPubkey}`
        );
        // Decide how to handle subscription failure. Maybe delete the created app?
        // For now, we'll still return the URL but log the error.
        // Consider returning a different status code or error message:
        // return reply.code(500).send({ message: "App created but failed to activate connection." });
      }

      // Return the relevant details of the created app
      return reply.code(201).send({
        name: newApp.name,
        pubkey: newApp.clientPubkey, // Use 'pubkey' to match frontend expectation
        nwcUrl: newApp.nwcUrl, // Optionally return the URL too
      });
    }
  );

  // Route to list apps for the authenticated user
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthenticatedUser;
    const username = user.username;

    const appsForUser = userApps[username] || [];

    // Return only the necessary fields for the list view
    const appListData = appsForUser.map((app) => ({
      name: app.name,
      pubkey: app.clientPubkey, // Use 'pubkey' to match frontend expectation
    }));

    return reply.send(appListData);
  });

  // TODO: Add routes for deleting apps, etc.
}

export default appRoutes;
