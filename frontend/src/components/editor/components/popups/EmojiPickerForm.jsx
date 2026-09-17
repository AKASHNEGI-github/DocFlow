import { useState, useMemo } from 'react';

// Curated rather than exhaustive — full Unicode emoji data is 1000+
// entries with skin-tone/gender variants, which is a lot of dead weight
// for a toolbar picker. This covers the ones people actually reach for,
// organized the way most pickers group them, each with a plain-English
// name so the search box has something to match against.
const CATEGORIES = ['All', 'Smileys', 'Gestures', 'Animals', 'Food', 'Activities', 'Symbols'];

const EMOJI = [
  // Smileys & emotion
  ['😀', 'grinning face', 'Smileys'], ['😃', 'smiling face big eyes', 'Smileys'], ['😄', 'smiling face happy eyes', 'Smileys'],
  ['😁', 'beaming face', 'Smileys'], ['😆', 'laughing squinting', 'Smileys'], ['😅', 'sweat smile', 'Smileys'],
  ['🤣', 'rolling on floor laughing rofl', 'Smileys'], ['😂', 'tears of joy laughing crying', 'Smileys'], ['🙂', 'slightly smiling face', 'Smileys'],
  ['🙃', 'upside down face', 'Smileys'], ['😊', 'smiling face blushing', 'Smileys'], ['😇', 'angel halo innocent', 'Smileys'],
  ['🥰', 'smiling face with hearts love', 'Smileys'], ['😍', 'heart eyes love', 'Smileys'], ['🤩', 'star struck', 'Smileys'],
  ['😘', 'kiss face blowing kiss', 'Smileys'], ['😋', 'yum delicious tongue', 'Smileys'], ['😜', 'winking tongue silly', 'Smileys'],
  ['🤪', 'zany crazy silly face', 'Smileys'], ['🤗', 'hugging face hug', 'Smileys'], ['🤔', 'thinking face', 'Smileys'],
  ['🤨', 'raised eyebrow suspicious', 'Smileys'], ['😐', 'neutral face', 'Smileys'], ['😴', 'sleeping zzz', 'Smileys'],
  ['🥳', 'party face celebration', 'Smileys'], ['😎', 'sunglasses cool', 'Smileys'], ['🤓', 'nerd face glasses', 'Smileys'],
  ['🥺', 'pleading puppy eyes', 'Smileys'], ['😢', 'crying sad tear', 'Smileys'], ['😭', 'sobbing loudly crying', 'Smileys'],
  ['😡', 'angry pouting mad', 'Smileys'], ['😱', 'screaming fear shocked', 'Smileys'], ['🤯', 'mind blown', 'Smileys'],
  ['🙄', 'eye roll', 'Smileys'], ['😏', 'smirking face', 'Smileys'], ['🥴', 'woozy dizzy face', 'Smileys'],

  // Gestures & people
  ['👋', 'waving hand hello bye', 'Gestures'], ['🤚', 'raised back of hand', 'Gestures'], ['✋', 'raised hand stop', 'Gestures'],
  ['👌', 'ok hand', 'Gestures'], ['🤞', 'crossed fingers luck', 'Gestures'], ['✌️', 'peace sign victory', 'Gestures'],
  ['🤟', 'love you gesture', 'Gestures'], ['🤘', 'rock on horns', 'Gestures'], ['👍', 'thumbs up yes good', 'Gestures'],
  ['👎', 'thumbs down no bad', 'Gestures'], ['👏', 'clapping hands applause', 'Gestures'], ['🙌', 'raising hands celebration', 'Gestures'],
  ['🙏', 'folded hands please thanks pray', 'Gestures'], ['💪', 'flexed bicep strong muscle', 'Gestures'], ['🤝', 'handshake deal', 'Gestures'],
  ['👀', 'eyes looking', 'Gestures'], ['🧠', 'brain smart', 'Gestures'], ['👶', 'baby', 'Gestures'],
  ['🧑', 'person', 'Gestures'], ['👨', 'man', 'Gestures'], ['👩', 'woman', 'Gestures'],
  ['🧓', 'older person', 'Gestures'], ['💃', 'dancing woman', 'Gestures'], ['🕺', 'dancing man', 'Gestures'],

  // Animals & nature
  ['🐶', 'dog puppy', 'Animals'], ['🐱', 'cat kitten', 'Animals'], ['🐭', 'mouse', 'Animals'],
  ['🐹', 'hamster', 'Animals'], ['🐰', 'rabbit bunny', 'Animals'], ['🦊', 'fox', 'Animals'],
  ['🐻', 'bear', 'Animals'], ['🐼', 'panda', 'Animals'], ['🐨', 'koala', 'Animals'],
  ['🐯', 'tiger', 'Animals'], ['🦁', 'lion', 'Animals'], ['🐮', 'cow', 'Animals'],
  ['🐷', 'pig', 'Animals'], ['🐸', 'frog', 'Animals'], ['🐵', 'monkey', 'Animals'],
  ['🐔', 'chicken', 'Animals'], ['🐧', 'penguin', 'Animals'], ['🐦', 'bird', 'Animals'],
  ['🦆', 'duck', 'Animals'], ['🦉', 'owl', 'Animals'], ['🐴', 'horse', 'Animals'],
  ['🦄', 'unicorn', 'Animals'], ['🐝', 'bee', 'Animals'], ['🦋', 'butterfly', 'Animals'],
  ['🐢', 'turtle', 'Animals'], ['🌸', 'cherry blossom flower', 'Animals'], ['🌻', 'sunflower', 'Animals'],
  ['🌈', 'rainbow', 'Animals'], ['🌳', 'tree', 'Animals'], ['🌊', 'wave ocean water', 'Animals'],

  // Food & drink
  ['🍎', 'apple', 'Food'], ['🍌', 'banana', 'Food'], ['🍇', 'grapes', 'Food'],
  ['🍓', 'strawberry', 'Food'], ['🍑', 'peach', 'Food'], ['🍍', 'pineapple', 'Food'],
  ['🥝', 'kiwi', 'Food'], ['🍅', 'tomato', 'Food'], ['🥑', 'avocado', 'Food'],
  ['🌽', 'corn', 'Food'], ['🥕', 'carrot', 'Food'], ['🍞', 'bread loaf', 'Food'],
  ['🧀', 'cheese', 'Food'], ['🍕', 'pizza', 'Food'], ['🍔', 'burger hamburger', 'Food'],
  ['🍟', 'fries', 'Food'], ['🌭', 'hot dog', 'Food'], ['🍿', 'popcorn', 'Food'],
  ['🍩', 'donut', 'Food'], ['🍪', 'cookie', 'Food'], ['🎂', 'birthday cake', 'Food'],
  ['🍰', 'cake slice', 'Food'], ['🍫', 'chocolate', 'Food'], ['🍦', 'ice cream soft serve', 'Food'],
  ['☕', 'coffee', 'Food'], ['🍵', 'tea', 'Food'], ['🍺', 'beer', 'Food'],
  ['🍷', 'wine', 'Food'], ['🥤', 'drink cup soda', 'Food'], ['🍉', 'watermelon', 'Food'],

  // Activities & objects
  ['⚽', 'soccer ball football', 'Activities'], ['🏀', 'basketball', 'Activities'], ['🏈', 'american football', 'Activities'],
  ['⚾', 'baseball', 'Activities'], ['🎾', 'tennis', 'Activities'], ['🏐', 'volleyball', 'Activities'],
  ['🎱', 'pool 8 ball billiards', 'Activities'], ['🏓', 'ping pong table tennis', 'Activities'], ['🎮', 'video game controller', 'Activities'],
  ['🎲', 'dice game', 'Activities'], ['🎨', 'art palette painting', 'Activities'], ['🎭', 'theater masks drama', 'Activities'],
  ['🎬', 'movie clapper film', 'Activities'], ['🎤', 'microphone singing', 'Activities'], ['🎧', 'headphones music', 'Activities'],
  ['🎸', 'guitar music', 'Activities'], ['🎯', 'dart target bullseye', 'Activities'], ['🏆', 'trophy winner award', 'Activities'],
  ['🥇', 'gold medal first place', 'Activities'], ['🎁', 'gift present', 'Activities'], ['🎈', 'balloon', 'Activities'],
  ['🎉', 'party popper celebration', 'Activities'], ['🎊', 'confetti ball celebration', 'Activities'], ['📱', 'phone mobile smartphone', 'Activities'],
  ['💻', 'laptop computer', 'Activities'], ['⌚', 'watch clock', 'Activities'], ['📷', 'camera photo', 'Activities'],
  ['💡', 'lightbulb idea', 'Activities'], ['📌', 'pushpin pin', 'Activities'], ['🔧', 'wrench tool', 'Activities'],

  // Symbols & travel
  ['❤️', 'red heart love', 'Symbols'], ['🧡', 'orange heart', 'Symbols'], ['💛', 'yellow heart', 'Symbols'],
  ['💚', 'green heart', 'Symbols'], ['💙', 'blue heart', 'Symbols'], ['💜', 'purple heart', 'Symbols'],
  ['🖤', 'black heart', 'Symbols'], ['💔', 'broken heart', 'Symbols'], ['✨', 'sparkles shiny', 'Symbols'],
  ['⭐', 'star', 'Symbols'], ['🔥', 'fire lit flame', 'Symbols'], ['💯', 'hundred points perfect', 'Symbols'],
  ['✅', 'check mark done', 'Symbols'], ['❌', 'cross mark no wrong', 'Symbols'], ['⚡', 'lightning bolt zap', 'Symbols'],
  ['☀️', 'sun sunny', 'Symbols'], ['🌙', 'crescent moon night', 'Symbols'], ['☁️', 'cloud', 'Symbols'],
  ['❄️', 'snowflake cold', 'Symbols'], ['🚀', 'rocket launch', 'Symbols'], ['✈️', 'airplane flight travel', 'Symbols'],
  ['🚗', 'car', 'Symbols'], ['🚲', 'bike bicycle', 'Symbols'], ['🏠', 'house home', 'Symbols'],
  ['🌍', 'globe earth world', 'Symbols'], ['📍', 'pin location', 'Symbols'], ['⏰', 'alarm clock time', 'Symbols'],
  ['💰', 'money bag', 'Symbols'], ['🔑', 'key unlock', 'Symbols'], ['🔒', 'lock secure', 'Symbols'],
];

export default function EmojiPickerForm({ editor, onClose }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EMOJI.filter(([, name, cat]) => {
      const inCategory = category === 'All' || cat === category;
      const matchesQuery = q === '' || name.includes(q);
      return inCategory && matchesQuery;
    });
  }, [query, category]);

  // Deliberately doesn't call onClose() after a pick — people reaching
  // for an emoji picker very often want several in a row (🎉🎊), so the
  // popup stays open the same way the special-character picker does;
  // re-saving the selection after each insert is what makes the next
  // pick land right after the previous one instead of at the old spot.
  const handlePick = (ch) => {
    editor.selection.restore();
    document.execCommand('insertText', false, ch);
    editor.selection.save();
    editor.onInput();
  };

  return (
    <div>
      <h3 className="jc-form-title">Emoji</h3>
      <input
        type="text"
        className="jc-emoji-search"
        placeholder="Search emoji…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        aria-label="Search emoji"
      />
      <div className="jc-emoji-categories" role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            className={`jc-emoji-category${category === c ? ' jc-emoji-category--active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {results.length > 0 ? (
        <div className="jc-emoji-grid">
          {results.map(([ch, name]) => (
            <button key={ch} type="button" className="jc-emoji-cell" title={name} onClick={() => handlePick(ch)}>
              {ch}
            </button>
          ))}
        </div>
      ) : (
        <div className="jc-emoji-empty">No emoji found for "{query}"</div>
      )}
      <div className="jc-form-actions">
        <button type="button" className="jc-btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
