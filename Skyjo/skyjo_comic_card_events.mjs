/**
 * Explicitly opt-in DOM event delegation for the Comic board.
 * No state changes occur unless the host supplies an authorized action bridge.
 */
export function bindComicCardInteractions({ root, bridge, isEnabled = () => false, isOwnPlayer = () => false }) {
  if (!root || typeof root.addEventListener !== 'function' ||
      !bridge || typeof bridge.dispatch !== 'function' || typeof isEnabled !== 'function' || typeof isOwnPlayer !== 'function')
    throw new TypeError('Invalid Comic interaction configuration');
  const findTarget = element => element?.closest?.('[data-comic-action]');
  function activate(event) {
    if (!isEnabled()) return;
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    const target = findTarget(event.target);
    if (!target || !root.contains(target)) return;
    const action = target.getAttribute('data-comic-action');
    if (action !== 'selectGridCard') return;
    const rawPlayer = target.getAttribute('data-player-index');
    const rawCard = target.getAttribute('data-card-index');
    if (rawPlayer === null || rawCard === null || !/^\d+$/.test(rawPlayer) || !/^\d+$/.test(rawCard)) return;
    const playerIndex = Number(rawPlayer);
    const cardIndex = Number(rawCard);
    if (!Number.isInteger(playerIndex) || !Number.isInteger(cardIndex) ||
        playerIndex < 0 || cardIndex < 0 || cardIndex > 11 || !isOwnPlayer(playerIndex)) return;
    if (event.type === 'keydown') event.preventDefault();
    bridge.dispatch(action, { playerIndex, cardIndex });
  }
  root.addEventListener('click', activate);
  root.addEventListener('keydown', activate);
  return () => {
    root.removeEventListener('click', activate);
    root.removeEventListener('keydown', activate);
  };
}
