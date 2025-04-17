import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
  RouteHandlerMethod, // Import RouteHandlerMethod for preHandler type
} from "fastify";
import bcrypt from "bcrypt";
// Removed jwt import, fastify-jwt handles signing
import { generateMnemonic, validateMnemonic } from "@scure/bip39"; // Import bip39 and validateMnemonic
import { wordlist } from "@scure/bip39/wordlists/english"; // Import wordlist
import { PrismaClient, User } from "@prisma/client"; // Import Prisma Client and User type
import { SparkLNBackend } from "../ln/SparkLNBackend"; // Import SparkLNBackend
import { WalletService } from "../nwc/WalletService";

// Removed in-memory store and SALT_ROUNDS

interface UserBody {
  username?: string;
  password?: string;
  mnemonic?: string; // Add mnemonic for the update route // TODO: move to new type
}

// Define options structure to include Prisma Client and the LN Backend Cache
interface UserRoutesOptions extends FastifyPluginOptions {
  walletService: WalletService;
  prisma: PrismaClient;
  lnBackendCache: Map<number, SparkLNBackend>; // User ID to spark backend cache type
}

async function userRoutes(
  fastify: FastifyInstance,
  options: UserRoutesOptions // Use the extended options type
) {
  // Authentication hook defined inside userRoutes to access options and fastify instance
  const authenticate: RouteHandlerMethod = async (request, reply) => {
    try {
      const decoded = await request.jwtVerify<{ userId: number }>();

      const user = await options.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return reply
          .code(401)
          .send({ message: "Unauthorized: User not found" });
      }
      // Attach user to the request using a type assertion that Fastify understands better
      // We modify the request object directly; Fastify allows this but TS needs guidance.
      (request as FastifyRequest & { user?: User }).user = user;
    } catch (err) {
      fastify.log.error(err, "Authentication failed");
      reply.code(401).send({ message: "Unauthorized: Invalid token" });
    }
  };
  const SALT_ROUNDS = 10; // Keep SALT_ROUNDS locally if needed for hashing

  // --- Routes ---

  // Signup route (public)
  fastify.post(
    "/signup",
    async (
      request: FastifyRequest<{ Body: UserBody }>,
      reply: FastifyReply
    ) => {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply
          .code(400)
          .send({ message: "Username and password are required" });
      }

      // Check if user already exists in the database
      const existingUser = await options.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return reply.code(409).send({ message: "Username already exists" });
      }

      let lnBackend: SparkLNBackend | null = null; // Declare lnBackend variable

      try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const mnemonic = generateMnemonic(wordlist, 128); // Generate mnemonic

        // --- Instantiate and Initialize Backend ---
        lnBackend = new SparkLNBackend(mnemonic);
        await lnBackend.init(); // Attempt to initialize - throws error if fails
        fastify.log.info(
          `SparkLNBackend initialized successfully for potential user ${username}`
        );
        // --- End Initialization ---

        // Create user in the database *after* successful backend initialization
        const newUser = await options.prisma.user.create({
          data: {
            username,
            passwordHash,
            mnemonic, // Store the validated mnemonic
          },
        });

        // Store the initialized backend instance in the cache
        options.lnBackendCache.set(newUser.id, lnBackend);
        fastify.log.info(
          `User ${username} signed up successfully and backend cached.`
        );

        // Sign a token with the user ID
        const token = fastify.jwt.sign({ userId: newUser.id }); // Use userId
        return reply.code(201).send({ token });
      } catch (error) {
        fastify.log.error(
          error,
          "Error during signup or backend initialization"
        );
        // If backend init fails, the user record is not saved, which is desired.
        return reply
          .code(500)
          .send({ message: "Internal Server Error during signup" });
      }
    }
  );

  // Login route
  fastify.post(
    "/login",
    async (
      request: FastifyRequest<{ Body: UserBody }>,
      reply: FastifyReply
    ) => {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply
          .code(400)
          .send({ message: "Username and password are required" });
      }

      // Find user in the database
      const user = await options.prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return reply.code(401).send({ message: "Invalid credentials" });
      }

      try {
        // Compare password hash
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
          return reply.code(401).send({ message: "Invalid credentials" });
        }

        // Sign a token with the user ID
        const token = fastify.jwt.sign({ userId: user.id }); // Use userId
        fastify.log.info(`User ${username} logged in`);
        // Note: We don't need to interact with the LN backend cache on login
        return reply.send({ token });
      } catch (error) {
        fastify.log.error(error, "Error during login");
        return reply.code(500).send({ message: "Internal Server Error" });
      }
    }
  );

  // --- Authenticated Routes ---

  // Update Mnemonic route (protected)
  // Use a more direct type assertion within the handler
  fastify.put<{ Body: UserBody }>( // Keep the generic body type here
    "/mnemonic",
    { preHandler: [authenticate] }, // Apply authentication hook
    async (request, reply) => {
      // Assert the request type *inside* the handler to include the user property
      const req = request as FastifyRequest<{ Body: UserBody }> & {
        user?: User;
      };
      const body = req.body; // Body is already typed by Fastify based on the route generic
      const mnemonic = body.mnemonic;
      const user = req.user; // Get user from the asserted request type

      if (!user) {
        // Should technically be caught by the hook, but good practice to check
        return reply.code(401).send({ message: "Unauthorized" });
      }

      if (!mnemonic) {
        return reply.code(400).send({ message: "Mnemonic is required" });
      }

      // Validate the imported mnemonic
      if (!validateMnemonic(mnemonic, wordlist)) {
        return reply.code(400).send({ message: "Invalid mnemonic phrase" });
      }

      let newLnBackend: SparkLNBackend | null = null;

      try {
        // 1. Update mnemonic in the database
        const updatedUser = await options.prisma.user.update({
          where: { id: user.id },
          data: { mnemonic: mnemonic }, // Update only the mnemonic
          include: {
            apps: true,
          },
        });
        fastify.log.info(`Mnemonic updated in DB for user ${user.username}`);

        // 2. Initialize new backend with the new mnemonic
        newLnBackend = new SparkLNBackend(updatedUser.mnemonic); // Use the updated mnemonic
        await newLnBackend.init(); // Attempt to initialize
        fastify.log.info(
          `New SparkLNBackend initialized successfully for user ${user.username}`
        );

        // 3. Update the cache with the new backend instance
        options.lnBackendCache.set(updatedUser.id, newLnBackend);
        fastify.log.info(`LN Backend cache updated for user ${user.username}`);

        // 4. Re-subscribe to apps
        // TODO: dynamically replace the existing LNbackend without re-subscribing
        for (const app of updatedUser.apps) {
          options.walletService.unsubscribe(app.clientPubkey);
          options.walletService.subscribe(
            app.clientPubkey,
            app.walletServiceSecretKey,
            newLnBackend,
            updatedUser.id,
            app.id,
            options.prisma
          );
        }

        return reply.send({ message: "Mnemonic updated successfully" });
      } catch (error: any) {
        fastify.log.error(
          error,
          `Error updating mnemonic or initializing backend for user ${user.username}`
        );

        // Optional: Attempt to revert DB change if backend init fails?
        // For simplicity, we'll leave the DB updated but report the error.
        // The user might need to retry or contact support if the backend is persistently unavailable.

        // Check if the error is from backend initialization
        if (error.message.includes("Failed to initialize Spark backend")) {
          return reply.code(503).send({
            message:
              "Mnemonic saved, but failed to connect to the Lightning backend. Please check backend settings or try again later.",
          });
        }

        return reply
          .code(500)
          .send({ message: "Internal Server Error during mnemonic update" });
      }
    }
  );

  // Get Mnemonic route (protected)
  fastify.get(
    "/mnemonic",
    { preHandler: [authenticate] }, // Apply authentication hook
    async (request, reply) => {
      // Assert the request type to include the user property
      const req = request as FastifyRequest & { user?: User };
      const user = req.user; // Get user from the asserted request type

      if (!user) {
        // Should be caught by the hook, but double-check
        return reply.code(401).send({ message: "Unauthorized" });
      }

      // The user object fetched by 'authenticate' already contains the mnemonic
      if (!user.mnemonic) {
        // This case should ideally not happen if signup always generates one
        fastify.log.warn(`User ${user.id} requested mnemonic, but none found.`);
        return reply.code(404).send({ message: "Mnemonic not found for user" });
      }

      fastify.log.info(`Mnemonic requested by user ${user.username}`);
      // Return only the mnemonic
      return reply.send({ mnemonic: user.mnemonic });
    }
  );
}

export default userRoutes;
