# ============================================
# MULTI-STAGE DOCKERFILE FOR NEXT.JS 16
# Optimized for production with minimal image size
# ============================================

# ---------- Stage 1: Install Dependencies ----------
FROM node:20-alpine AS deps

# Add libc6-compat for Alpine Node.js compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install production and dev dependencies (dev needed for build)
RUN npm ci

# ---------- Stage 2: Build the Application ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Set environment to production for optimized build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# ---- NEXT_PUBLIC_* must be present at BUILD time ----
#
# Next.js inlines every NEXT_PUBLIC_* variable into the compiled output -- both
# the client chunks and the server bundle. They are substituted during `next
# build`, so supplying them only at container runtime has no effect: the value
# baked into the bundle wins.
#
# Without these ARGs the image builds "successfully" but ships
# `undefined` as the Supabase URL and key, and the app fails in the browser.
#
# Passing these as build args is safe: NEXT_PUBLIC_* values are public by
# definition -- they are served to every visitor inside the JS bundle. Never add
# a server-only secret (OPENROUTER_API_KEY) here, because build args are
# recorded in the image history. Server-only variables are read from the real
# environment at runtime and must stay runtime-only.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Fail loudly at build time rather than shipping a broken image.
# ${VAR:?msg} aborts the shell with a non-zero status when VAR is unset or empty.
RUN : "${NEXT_PUBLIC_SUPABASE_URL:?is required as a --build-arg}" \
 && : "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?is required as a --build-arg}" \
 && : "${NEXT_PUBLIC_SITE_URL:?is required as a --build-arg}"

# Build the Next.js application
RUN npm run build

# ---------- Stage 3: Production Runner ----------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone output and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set hostname for container networking
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
