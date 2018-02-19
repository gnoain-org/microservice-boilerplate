### BASE #######################################################################
FROM node:8.9.4-alpine as base
LABEL version="1.0"
LABEL maintainer="Guillermo Noain <guillermo.noain@quantion.es>"

# Install yarn
RUN apk --no-cache add yarn

# Set tini entrypoint
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# Add a non-root user and set working directory
RUN addgroup -S app
RUN adduser -S app -G app
WORKDIR /app
RUN chown -R app:app /app
USER app

# Copy project specification and dependencies lock files
COPY package.json yarn.lock ./

################################################################################

### DEPENDENCIES ###############################################################
FROM base as dependencies

# Set proxy for yarn (There is a bug in Yarn that should be fixed in v1.4)
RUN yarn config set proxy http://t0000104:12345678@192.168.50.140:8080
RUN yarn config set https-proxy http://t0000104:12345678@192.168.50.140:8080

# Install production dependencies
RUN yarn --pure-lockfile --production
# Copy production dependencies aside
RUN cp -R node_modules prod_node_modules

# Install ALL dependencies
RUN yarn --pure-lockfile
################################################################################

### TEST #######################################################################
FROM dependencies AS test

# Copy app sources
COPY . .
# Run tests
#RUN yarn test
################################################################################

### RELEASE ####################################################################
FROM base AS release

# Copy production dependencies
COPY --chown=app:app --from=dependencies /app/prod_node_modules ./node_modules

# Copy sources
COPY --chown=app:app . .

# Launch node process
CMD ["node","src/index.js"]
EXPOSE 4033 5858 9229
################################################################################
