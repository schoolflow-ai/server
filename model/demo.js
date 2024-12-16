const chart = require('../helper/chart.js');
const i18n = require('i18n');

/*
* returns sample data for the demo dashboard
* you can delete this file
*/

exports.revenue = function revenue({ locale }){

  locale && i18n.setLocale(locale);

  const year1 = new Date().getFullYear()-2;
  const year2 = new Date().getFullYear()-1;

  let data = []
  const labels = [`${year1} ${i18n.__('demo.revenue')}`, `${year2} ${i18n.__('demo.revenue')}`];
  const months = i18n.__('global.months').split(',');

  const values = [
    [24846,28464,31375,35312,32716,36746,39474,43756,49790,53744,58376,64232],
    [64232,64647,56338,55347,54462,62374,66334,69573,71464,69464,75474,78757]
  ]

  for (const set in values){
    data[set] = months.map((month, i) => {

      return { label: month, value: values[set][i] }

    })
  }

  return chart.create({ datasets: data, labels: labels });

}

exports.users = function users({ locale }){

  locale && i18n.setLocale(locale);
  const mon = i18n.__('global.months').split(',')[0];

  return [
    { id: 1, name: 'Joseph Sandoval', email: 'joseph_88@example.com', plan: 'startup', created: `11 ${mon} 2024` },
    { id: 2, name: 'Alan Reed', email: 'alan_reed@example.com', plan: 'startup', created: `09 ${mon} 2024` },
    { id: 3, name: 'Maria Sanchez', email: 'maria_86@example.com', plan: 'startup', created: `11 ${mon} 2024` },
    { id: 4, name: 'Gloria Gordon', email: 'gloria-89@example.com', plan: 'startup', created: `09 ${mon} 2024` },
    { id: 5, name: 'Daniel Guerrero', email: 'daniel-88@example.com', plan: 'enterprise', created: `08 ${mon} 2024` },
    { id: 6, name: 'Amanda Walsh', email: 'amanda.walsh@example.com', plan: 'enterprise', created: `07 ${mon} 2024` },
    { id: 7, name: 'Jose Hall', email: 'jose_hall@example.com', plan: 'enterprise', created: `07 ${mon} 2024` },
    { id: 8, name: 'Ethan Russell', email: 'ethan_86@example.com', plan: 'enterprise', created: `07 ${mon} 2024` },
    { id: 9, name: 'Nicole Barnett', email: 'nicole87@example.com', plan: 'enterprise', created: `06 ${mon} 2024` }
  ]
}


exports.users.types = function userTypes({ locale }){

  locale && i18n.setLocale(locale);
  const labels = 'User';
  const data = [

    { label: i18n.__('demo.owner'), value: 7233 },
    { label: i18n.__('demo.admin'), value: 321 },
    { label: i18n.__('demo.user'), value: 2101 }

  ];

  return chart.create({ datasets: data, labels: labels });

}

exports.stats = function stats({ locale }){

  locale && i18n.setLocale(locale);

  return([
    { 
      label: i18n.__('demo.stats.users'), 
      value: 9655,
      icon: 'users',
    },
    { 
      label: i18n.__('demo.stats.active'), 
      value: 9255,
      icon: 'check',
    },
    {
      label: i18n.__('demo.stats.churned'), 
      value: 400,
      icon: 'refresh-cw'
    },
    {
      label: i18n.__('demo.stats.latest'), 
      value: 231,
      icon: 'calendar',
      change: '5%'
    }
  ]);
}

exports.progress = function progress({ locale }){

  locale && i18n.setLocale(locale);
  
  return([
    { label: i18n.__('demo.progress.mrr'), value: 75 },
    { label: i18n.__('demo.progress.users'), value: 90 },
    { label: i18n.__('demo.progress.churn'), value: 40 },
    { label: i18n.__('demo.progress.teams'), value: 20 },
    { label: i18n.__('demo.progress.goal'), value: 78 }
  ]);
}
