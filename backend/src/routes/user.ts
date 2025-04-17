import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import bcrypt from "bcrypt";
// Removed jwt import, fastify-jwt handles signing
import { generateMnemonic } from "@scure/bip39"; // Import bip39
import { wordlist } from "@scure/bip39/wordlists/english"; // Import wordlist
import { PrismaClient } from "@prisma/client"; // Import Prisma Client
import { SparkLNBackend } from "../ln/SparkLNBackend"; // Import SparkLNBackend

// Removed in-memory store and SALT_ROUNDS

interface UserBody {
  username?: string;
  password?: string;
}

// Define options structure to include Prisma Client and the LN Backend Cache
interface UserRoutesOptions extends FastifyPluginOptions {
  prisma: PrismaClient;
  lnBackendCache: Map<number, SparkLNBackend>; // usd ID to spark backend cache type
}

async function userRoutes(
  fastify: FastifyInstance,
  options: UserRoutesOptions // Use the extended options type
) {
  const SALT_ROUNDS = 10; // Keep SALT_ROUNDS locally if needed for hashing

  // Signup route
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
}

export default userRoutes;
