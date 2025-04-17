import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyJwt from "@fastify/jwt";
import path from "path";
import userRoutes from "./routes/user";
import appRoutes from "./routes/apps"; // Import app routes
import { WalletService } from "./nwc/WalletService";
import { SparkLNBackend } from "./ln/SparkLNBackend"; // Import LN Backend

const walletService = new WalletService();
// Removed: walletService.subscribe();

// Removed global LN Backend instantiation

const fastify = Fastify({
  logger: true,
});

// Register fastify-static to serve the React app build
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../../frontend/dist"), // Path to the built React app
  prefix: "/", // Serve from the root
});

// Register fastify-jwt
fastify.register(fastifyJwt, {
  secret: "supersecret", // Change this to an environment variable in production!
});

// Register user routes
fastify.register(userRoutes, { prefix: "/api/users" });
// Register app routes, passing the walletService instance
fastify.register(appRoutes, { prefix: "/api/apps", walletService }); // Removed lnBackend

// Fallback route to serve index.html for client-side routing
fastify.setNotFoundHandler((request, reply) => {
  // Check if the request is not for an API endpoint
  if (!request.raw.url?.startsWith("/api")) {
    reply.sendFile("index.html");
  } else {
    reply.code(404).send({ message: "Not Found" });
  }
});

// Run the server
const start = async () => {
  try {
    // Removed global LN backend initialization

    await fastify.listen({ port: 3001, host: "0.0.0.0" }); // Use port 3001 for the backend
    fastify.log.info(
      `Server listening on ${fastify.server.address()?.toString()}`
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
