const fastify = require('fastify')();
const path = require('path');
const fastifyStatic = require('@fastify/static');
const PORT = 8080;

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
});

fastify.listen(PORT, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`devserver started on ${address}`);
});
