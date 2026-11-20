import { soundFX } from '../utils/soundFX.js';

export const TRIVIA_PUZZLES = [
  {
    category: 'Movie',
    emoji: '🧙‍♂️ 🧝‍♂️ 💍 🌋',
    hint: 'One ring to rule them all...',
    answer: 'The Lord of the Rings',
    aliases: ['lord of the rings', 'lotr', 'the lord of the rings', 'fellowship of the ring']
  },
  {
    category: 'TV Series',
    emoji: '🧪 👨‍🔬 🍗 💰',
    hint: 'High school chemistry teacher turned empire builder in New Mexico.',
    answer: 'Breaking Bad',
    aliases: ['breaking bad']
  },
  {
    category: 'Movie',
    emoji: '🦖 🦕 🏝️ 🚙',
    hint: 'Life, uh, finds a way on an island theme park.',
    answer: 'Jurassic Park',
    aliases: ['jurassic park', 'jurassic world']
  },
  {
    category: 'Movie',
    emoji: '🚢 🧊 💔 🚪',
    hint: 'There was definitely room for two on that door...',
    answer: 'Titanic',
    aliases: ['titanic']
  },
  {
    category: 'Movie',
    emoji: '🦇 🃏 🌃 🚓',
    hint: 'Why so serious in Gotham City?',
    answer: 'The Dark Knight',
    aliases: ['the dark knight', 'dark knight', 'batman']
  },
  {
    category: 'Superhero',
    emoji: '🕷️ 🕸️ 🧑 🏙️',
    hint: 'With great power comes great responsibility.',
    answer: 'Spider-Man',
    aliases: ['spider-man', 'spiderman', 'spider man', 'peter parker']
  },
  {
    category: 'Movie / Book',
    emoji: '⚡️ 👓 🧙‍♂️ 🦉',
    hint: 'The boy who lived, attending a school of witchcraft.',
    answer: 'Harry Potter',
    aliases: ['harry potter']
  },
  {
    category: 'TV Series',
    emoji: '🧇 🚲 🔦 👾',
    hint: '80s kids, Eggo waffles, and the Upside Down.',
    answer: 'Stranger Things',
    aliases: ['stranger things']
  },
  {
    category: 'Movie',
    emoji: '🕶️ 💊 🐇 💻',
    hint: 'Take the red pill or blue pill.',
    answer: 'The Matrix',
    aliases: ['the matrix', 'matrix']
  },
  {
    category: 'Movie',
    emoji: '🦁 👑 🌅 🐗',
    hint: 'Hakuna Matata and the Pride Lands.',
    answer: 'The Lion King',
    aliases: ['the lion king', 'lion king']
  },
  {
    category: 'Movie',
    emoji: '🏴‍☠️ 🦜 ⚓️ 🪙',
    hint: 'Captain Jack Sparrow searching for rum and cursed gold.',
    answer: 'Pirates of the Caribbean',
    aliases: ['pirates of the caribbean', 'pirates of the caribbean: the curse of the black pearl']
  },
  {
    category: 'Movie',
    emoji: '👨‍🍳 🐀 🧀 🥖',
    hint: 'Anyone can cook, even in a French kitchen with whiskers.',
    answer: 'Ratatouille',
    aliases: ['ratatouille']
  },
  {
    category: 'Movie',
    emoji: '🚀 👨‍🚀 🌌 ⏳',
    hint: 'Time dilation, black holes, and love transcending dimensions.',
    answer: 'Interstellar',
    aliases: ['interstellar']
  },
  {
    category: 'TV Series',
    emoji: '👑 ⚔️ 🐉 ❄️',
    hint: 'Winter is coming to Westeros.',
    answer: 'Game of Thrones',
    aliases: ['game of thrones', 'got']
  },
  {
    category: 'Movie',
    emoji: '👨‍🚀 🤠 🧸 🚀',
    hint: 'You’ve got a friend in me, to infinity and beyond.',
    answer: 'Toy Story',
    aliases: ['toy story']
  },
  {
    category: 'Actor',
    emoji: '🕶️ ✈️ 🏍️ 🏃‍♂️',
    hint: 'Famous for doing his own wild stunts in Top Gun and Mission Impossible.',
    answer: 'Tom Cruise',
    aliases: ['tom cruise']
  },
  {
    category: 'TV Series',
    emoji: '☕️ 🛋️ 👥 🗽',
    hint: 'Six pals hanging out at Central Perk coffee house.',
    answer: 'Friends',
    aliases: ['friends']
  },
  {
    category: 'Movie',
    emoji: '👻 🚫 🔫 🚗',
    hint: 'Who you gonna call?',
    answer: 'Ghostbusters',
    aliases: ['ghostbusters']
  }
];

export const CONVERSATION_DECK = [
  {
    id: 1,
    topic: 'Wilderness & Wonder',
    question: "What is the most unusual, hilarious, or unexplainable experience you've ever had outdoors or on a trip?"
  },
  {
    id: 2,
    topic: 'Superpower Dream',
    question: "If you could instantly wake up tomorrow as a world-class master of any single skill or craft, what would it be?"
  },
  {
    id: 3,
    topic: 'Life Soundtrack',
    question: "If your life was a cinematic movie, what song would be blasting during the opening title sequence?"
  },
  {
    id: 4,
    topic: 'Shift in Perspective',
    question: "What is one belief or opinion you held 5 years ago that you completely disagree with today?"
  },
  {
    id: 5,
    topic: 'Selfless Wish',
    question: "You find an ancient magical artifact that grants one huge wish, but it can ONLY benefit someone else. Who do you pick and what do you wish for?"
  },
  {
    id: 6,
    topic: 'Survival Island',
    question: "You are marooned on an uncharted tropical island for 30 days. You can only bring 3 objects currently in your bedroom. What are you grabbing?"
  },
  {
    id: 7,
    topic: 'Nostalgia Trigger',
    question: "What simple scent, sound, or taste instantly teleports you back to childhood?"
  },
  {
    id: 8,
    topic: 'Golden Wisdom',
    question: "What is the single best piece of advice you've ever received that genuinely changed how you live?"
  },
  {
    id: 9,
    topic: 'Fictional Vacation',
    question: "If you could step into any fictional universe (book, movie, or game) for 24 hours with zero danger, where are you exploring?"
  },
  {
    id: 10,
    topic: 'Unsung Glory',
    question: "What is something you are secretly or quietly proud of that you rarely get an opportunity to brag about?"
  },
  {
    id: 11,
    topic: 'Time Traveler',
    question: "If you had a time machine that only let you watch one historical event like a spectator with popcorn, which moment in history are you watching?"
  },
  {
    id: 12,
    topic: 'Quirky Confession',
    question: "What is an unusual food combination or comfort snack you swear by, even if other people judge you for it?"
  }
];

export class PartyGameManager {
  constructor(networkManager) {
    this.network = networkManager;
    this.activeTab = 'trivia'; // 'trivia' | 'qa'

    // Trivia Game State
    this.triviaIndex = 0;
    this.scores = {}; // playerName -> number
    this.triviaSolved = false;
    this.triviaWinner = null;
    this.revealedHint = false;

    // Q&A State
    this.qaIndex = 0;

    // Chat history
    this.chatLog = [];

    // UI callbacks
    this.onStateChanged = null;

    // Listen to network sync events
    if (this.network) {
      this.network.onPartyGameSync = (payload) => this.handleNetworkSync(payload);
      this.network.onChatMessage = (msg) => this.handleIncomingChatMessage(msg);
    }
  }

  // Normalize string for fuzzy answer checking
  cleanText(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  // Submit guess for current trivia puzzle
  submitGuess(playerName, guessText) {
    if (this.triviaSolved) return { correct: false, msg: 'Round already finished!' };

    const cleanGuess = this.cleanText(guessText);
    const puzzle = TRIVIA_PUZZLES[this.triviaIndex];

    const isMatch = puzzle.aliases.some(alias => this.cleanText(alias) === cleanGuess);

    if (isMatch) {
      this.triviaSolved = true;
      this.triviaWinner = playerName;
      this.scores[playerName] = (this.scores[playerName] || 0) + 10;
      soundFX.playSuccess();

      // Broadcast sync
      this.syncState();

      // Add announcement to chat
      this.addChatMessage('System', `🎉 ${playerName} correctly guessed "${puzzle.answer}"! (+10 pts)`);

      // Auto advance to next card after 3.5s
      setTimeout(() => {
        this.nextTrivia();
      }, 3500);

      return { correct: true, answer: puzzle.answer };
    } else {
      soundFX.playPop();
      return { correct: false, msg: 'Not quite! Try again.' };
    }
  }

  revealHint() {
    this.revealedHint = true;
    this.syncState();
  }

  nextTrivia() {
    this.triviaIndex = (this.triviaIndex + 1) % TRIVIA_PUZZLES.length;
    this.triviaSolved = false;
    this.triviaWinner = null;
    this.revealedHint = false;
    this.syncState();
  }

  prevTrivia() {
    this.triviaIndex = (this.triviaIndex - 1 + TRIVIA_PUZZLES.length) % TRIVIA_PUZZLES.length;
    this.triviaSolved = false;
    this.triviaWinner = null;
    this.revealedHint = false;
    this.syncState();
  }

  nextQA() {
    this.qaIndex = (this.qaIndex + 1) % CONVERSATION_DECK.length;
    this.syncState();
    soundFX.playPop();
  }

  prevQA() {
    this.qaIndex = (this.qaIndex - 1 + CONVERSATION_DECK.length) % CONVERSATION_DECK.length;
    this.syncState();
    soundFX.playPop();
  }

  sendChat(playerName, text) {
    if (!text || !text.trim()) return;
    const msg = {
      sender: playerName,
      text: text.trim(),
      timestamp: Date.now()
    };
    this.addChatMessage(msg.sender, msg.text);

    if (this.network) {
      this.network.broadcast({
        type: 'chat_message',
        ...msg
      });
    }
  }

  addChatMessage(sender, text) {
    const item = {
      sender,
      text,
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.chatLog.push(item);
    if (this.chatLog.length > 50) this.chatLog.shift();

    if (this.onStateChanged) this.onStateChanged();
  }

  handleIncomingChatMessage(msg) {
    this.addChatMessage(msg.sender, msg.text);
  }

  syncState() {
    const payload = {
      activeTab: this.activeTab,
      triviaIndex: this.triviaIndex,
      triviaSolved: this.triviaSolved,
      triviaWinner: this.triviaWinner,
      revealedHint: this.revealedHint,
      scores: this.scores,
      qaIndex: this.qaIndex
    };

    if (this.network) {
      this.network.broadcast({
        type: 'party_game_sync',
        payload
      });
    }

    if (this.onStateChanged) this.onStateChanged();
  }

  handleNetworkSync(payload) {
    if (!payload) return;
    this.activeTab = payload.activeTab ?? this.activeTab;
    this.triviaIndex = payload.triviaIndex ?? this.triviaIndex;
    this.triviaSolved = payload.triviaSolved ?? this.triviaSolved;
    this.triviaWinner = payload.triviaWinner ?? this.triviaWinner;
    this.revealedHint = payload.revealedHint ?? this.revealedHint;
    this.scores = payload.scores ?? this.scores;
    this.qaIndex = payload.qaIndex ?? this.qaIndex;

    if (this.onStateChanged) this.onStateChanged();
  }
}
