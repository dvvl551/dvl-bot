
const ACTION_GIFS = {
  kiss: [
    'https://media.tenor.com/b7Y2Qf5fPj4AAAAC/anime-kiss.gif',
    'https://media.tenor.com/AqN0m5fA7YgAAAAC/kiss-anime.gif'
  ],
  hug: [
    'https://media.tenor.com/5qM3b4X8nVwAAAAC/anime-hug.gif',
    'https://media.tenor.com/3wE7-_-wJQ8AAAAC/hug-anime.gif'
  ],
  slap: [
    'https://media.tenor.com/XiYuU9h44-AAAAAC/slap-anime.gif',
    'https://media.tenor.com/MXZGFeF7lGcAAAAC/anime-slap.gif'
  ],
  pat: [
    'https://media.tenor.com/0mdH8H6jVJIAAAAC/anime-headpat.gif',
    'https://media.tenor.com/Ce4Wm0g95WcAAAAC/pat-anime.gif'
  ],
  cuddle: [
    'https://media.tenor.com/2roX3uxz_68AAAAC/anime-cuddle.gif'
  ],
  poke: [
    'https://media.tenor.com/AK4e2qJwz8kAAAAC/anime-poke.gif'
  ],
  bonk: [
    'https://media.tenor.com/1Fh7V6czS4QAAAAC/bonk-anime.gif'
  ],
  punch: [
    'https://media.tenor.com/o95D6N3L4JIAAAAC/punch-anime.gif'
  ],
  wave: [
    'https://media.tenor.com/6v9m8fYzjEoAAAAC/anime-wave.gif'
  ],
  highfive: [
    'https://media.tenor.com/1g2g6bJ0VJgAAAAC/high-five-anime.gif'
  ],
  lick: [
    'https://media.tenor.com/H1QdAZt0pQwAAAAC/anime-lick.gif'
  ],
  bite: [
    'https://media.tenor.com/X5uN1lE7dHEAAAAC/anime-bite.gif'
  ],
  cry: [
    'https://media.tenor.com/f3m4B8q6QKAAAAAC/anime-cry.gif'
  ],
  dance: [
    'https://media.tenor.com/y2JXkY1zW4QAAAAC/anime-dance.gif'
  ],
  handhold: [
    'https://media.tenor.com/4s3ANh6n8AEAAAAC/hand-holding-anime.gif'
  ],
  boop: [
    'https://media.tenor.com/S0wE9M8iByAAAAAC/boop-anime.gif'
  ],
  tickle: [
    'https://media.tenor.com/G8jB-6adO3sAAAAC/tickle-anime.gif'
  ],
  love: [
    'https://media.tenor.com/ATZ2TQ9Pw8wAAAAC/anime-love.gif'
  ],
  carry: [
    'https://media.tenor.com/cdQbS36NQSkAAAAC/anime-carry.gif'
  ],
  protect: [
    'https://media.tenor.com/7UQv5vSRV_cAAAAC/anime-protect.gif'
  ],
  comfort: [
    'https://media.tenor.com/3KQY8vN6jjQAAAAC/comfort-hug.gif'
  ],
  petpet: [
    'https://media.tenor.com/3ZZR1x6oKJQAAAAC/pet-anime.gif'
  ],
  crown: [
    'https://media.tenor.com/6jB61P4gY14AAAAC/anime-princess.gif'
  ]
};

function getActionGif(name) {
  const list = ACTION_GIFS[name];
  if (!list?.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = { ACTION_GIFS, getActionGif };
