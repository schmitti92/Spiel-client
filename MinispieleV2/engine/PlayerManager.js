/** Pure participant roster for MiniGame V2. IDs come from the shared hub; never create online identities here. */
export function validatePlayers(players) {
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) throw Error('PLAYER_COUNT_1_TO_4');
  const ids = new Set();
  for (const player of players) {
    if (!player || typeof player !== 'object' || typeof player.id !== 'string' || !player.id || !['human','bot'].includes(player.type)) throw Error('INVALID_PLAYER');
    if (ids.has(player.id)) throw Error('DUPLICATE_PLAYER');
    ids.add(player.id);
  }
  return players.map(({id,type})=>Object.freeze({id,type}));
}

/** Check a game's individual participant limits without changing the shared roster. */
export function validateGamePlayers(players, game) {
  const roster = validatePlayers(players);
  if (!game || typeof game !== 'object' || Array.isArray(game)) throw Error('GAME_REQUIRED');
  const min = game.minPlayers ?? 1;
  const max = game.maxPlayers ?? 4;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 4 || min > max) throw Error('INVALID_GAME_PLAYER_LIMITS');
  if (roster.length < min || roster.length > max) throw Error('GAME_PLAYER_LIMITS');
  return roster;
}

export function createPlayerManager(players) {
  const roster = Object.freeze(validatePlayers(players));
  const lookup = new Map(roster.map(p=>[p.id,p]));
  return Object.freeze({
    list: () => roster.map(p=>({...p})),
    get: id => lookup.has(id) ? {...lookup.get(id)} : null,
    isBot: id => lookup.get(id)?.type === 'bot',
    isHuman: id => lookup.get(id)?.type === 'human',
    requireHuman: id => {
      const player = lookup.get(id);
      if (!player) throw Error('UNKNOWN_PLAYER');
      if (player.type !== 'human') throw Error('PLAYER_NOT_HUMAN');
      return {...player};
    },
    requireBot: id => {
      const player = lookup.get(id);
      if (!player) throw Error('UNKNOWN_PLAYER');
      if (player.type !== 'bot') throw Error('PLAYER_NOT_BOT');
      return {...player};
    }
  });
}
