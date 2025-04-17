import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyJwt from "@fastify/jwt";
import path from "path";
import { PrismaClient } from "@prisma/client"; // Import Prisma Client
import userRoutes from "./routes/user";
import appRoutes from "./routes/apps"; // Import app routes
import { WalletService } from "./nwc/WalletService";
import { SparkLNBackend } from "./ln/SparkLNBackend"; // Import LN Backend

const prisma = new PrismaClient(); // Instantiate Prisma Client
const walletService = new WalletService();
const lnBackendCache = new Map<number, SparkLNBackend>(); // Create the cache
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
fastify.register(userRoutes, { prefix: "/api/users", prisma, lnBackendCache }); // Pass prisma and cache
// Register app routes, passing the walletService, prisma, and cache instances
fastify.register(appRoutes, {
  prefix: "/api/apps",
  walletService,
  prisma,
  lnBackendCache,
}); // Pass prisma and cache

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

    // --- Phase 3: Startup Initialization ---
    fastify.log.info(
      "Starting user LN backend initialization and NWC subscriptions..."
    );
    const usersWithApps = await prisma.user.findMany({
      include: { apps: true }, // Include related apps
    });

    for (const user of usersWithApps) {
      try {
        // 1. Initialize LN Backend for the user
        const lnBackend = new SparkLNBackend(user.mnemonic);
        await lnBackend.init();

        // 2. Cache the initialized backend instance
        lnBackendCache.set(user.id, lnBackend);
        fastify.log.info(
          `Initialized and cached LN backend for user ${user.id}`
        );

        // 3. Subscribe NWC for each of the user's apps
        for (const app of user.apps) {
          try {
            await walletService.subscribe(
              app.clientPubkey,
              app.walletServiceSecretKey,
              lnBackend // Use the initialized & cached backend
            );
            fastify.log.info(
              `Subscribed NWC for app '${app.name}' (ID: ${app.id}) of user ${user.id}`
            );
          } catch (subscribeError) {
            fastify.log.error(
              subscribeError,
              `Failed to subscribe NWC for app ${app.id} of user ${user.id}`
            );
            // Continue trying to subscribe other apps for this user
          }
        }
      } catch (initError) {
        fastify.log.error(
          initError,
          `Failed to initialize LN backend for user ${user.id}. Skipping app subscriptions for this user.`
        );
        // Continue to the next user
      }
    }
    fastify.log.info("Completed startup initialization.");
    // --- End Phase 3 ---

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
