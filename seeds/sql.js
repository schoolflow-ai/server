const data = require('./email/data');

exports.seed = async function(knex){

  await knex('email').insert(data);
  
};
