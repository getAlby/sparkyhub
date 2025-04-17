import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateMnemonic } from "@scure/bip39"; // Import bip39
import { wordlist } from "@scure/bip39/wordlists/english"; // Import wordlist
import { SparkLNBackend } from "../ln/SparkLNBackend"; // Import SparkLNBackend

// In-memory store for users (replace with a database in production)
export const users: Record<
  // Export users object
  string,
  { passwordHash: string; mnemonic: string; lnBackend: SparkLNBackend }
> = {}; // Add mnemonic and lnBackend
const SALT_ROUNDS = 10;

interface UserBody {
  username?: string;
  password?: string;
}

async function userRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
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

      if (users[username]) {
        return reply.code(409).send({ message: "Username already exists" });
      }

      try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const mnemonic = generateMnemonic(wordlist, 128); // Generate mnemonic

        // Instantiate and initialize the backend for the user
        const userLnBackend = new SparkLNBackend(mnemonic);
        await userLnBackend.init(); // Initialize the backend

        // Store user data including the initialized backend
        users[username] = { passwordHash, mnemonic, lnBackend: userLnBackend };
        fastify.log.info(
          `User ${username} signed up with mnemonic and initialized backend`
        );

        // Optionally sign a token immediately upon signup
        const token = fastify.jwt.sign({ username });
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

      const user = users[username];
      if (!user) {
        return reply.code(401).send({ message: "Invalid credentials" });
      }

      try {
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
          return reply.code(401).send({ message: "Invalid credentials" });
        }

        const token = fastify.jwt.sign({ username });
        fastify.log.info(`User ${username} logged in`);
        return reply.send({ token });
      } catch (error) {
        fastify.log.error(error, "Error during login");
        return reply.code(500).send({ message: "Internal Server Error" });
      }
    }
  );
}

export default userRoutes;
