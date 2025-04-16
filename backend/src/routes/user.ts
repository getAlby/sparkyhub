import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// In-memory store for users (replace with a database in production)
const users: Record<string, { passwordHash: string }> = {};
const SALT_ROUNDS = 10;

interface UserBody {
  username?: string;
  password?: string;
}

async function userRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

  // Signup route
  fastify.post('/signup', async (request: FastifyRequest<{ Body: UserBody }>, reply: FastifyReply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.code(400).send({ message: 'Username and password are required' });
    }

    if (users[username]) {
      return reply.code(409).send({ message: 'Username already exists' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      users[username] = { passwordHash };
      fastify.log.info(`User ${username} signed up`);
      // Optionally sign a token immediately upon signup
      const token = fastify.jwt.sign({ username });
      return reply.code(201).send({ token });
    } catch (error) {
      fastify.log.error(error, 'Error during signup');
      return reply.code(500).send({ message: 'Internal Server Error' });
    }
  });

  // Login route
  fastify.post('/login', async (request: FastifyRequest<{ Body: UserBody }>, reply: FastifyReply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.code(400).send({ message: 'Username and password are required' });
    }

    const user = users[username];
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    try {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return reply.code(401).send({ message: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({ username });
      fastify.log.info(`User ${username} logged in`);
      return reply.send({ token });
    } catch (error) {
      fastify.log.error(error, 'Error during login');
      return reply.code(500).send({ message: 'Internal Server Error' });
    }
  });
}

export default userRoutes;