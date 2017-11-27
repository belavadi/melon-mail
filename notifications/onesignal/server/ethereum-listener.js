const Web3 = require('web3');
const request = require('request');
const config = require('../../../config/config.json');

const apiKey = config.pushNotifApiKey;
const web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.decenter.com'));
const contract = web3.eth.contract(config.mailContractAbi).at(config.mailContractAddress);

const listenForMails = (callback) => {
  web3.eth.getBlockNumber((error, currentBlock) => {
    contract.EmailSent({}, { fromBlock: currentBlock, toBlock: 'latest' })
      .watch((err, event) => {
        if (err) {
          console.error(err);
          return;
        }

        callback(event);
      });
  });
};

listenForMails((event) => {
  console.log(`Event received: ${event.transactionHash}`);

  const options = {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Basic ${apiKey}`,
    },
    url: 'https://onesignal.com/api/v1/notifications',
    body: JSON.stringify({
      app_id: '15ec424e-2544-4b66-9112-f1c6bd4f950e',
      contents: { en: 'You have a new MelonMail!' },
      chrome_web_icon: 'https://decenter.com/assets/melon-notification-icon.png',
      filters: [
        {
          field: 'tag',
          key: 'address',
          relation: '=',
          value: event.args.to,
        },
      ],
    }),
  };

  request.post(options, (err, response, body) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(`Notification sent for ${event.args.to} from ${event.args.from}`);
  });
});
