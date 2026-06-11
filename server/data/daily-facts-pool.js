/**
 * Static fact pool — used when Ollama is unavailable. Rotates by date + grade.
 */

const { DAILY_FACT_SUBJECTS, FACT_COUNT } = require('../utils/dailyFactsSubjects');

const POOL = {
  science: [
    { title: 'Light speed', fact: 'Light travels about 300,000 km every second — fast enough to go around Earth more than 7 times in one second!' },
    { title: 'Water expands', fact: 'When water freezes into ice, it takes up more space than liquid water. That is why ice floats on water.' },
    { title: 'Human body', fact: 'Your brain uses about 20% of your body\'s energy even though it is only about 2% of your weight.' },
    { title: 'Plants breathe', fact: 'Plants take in carbon dioxide and release oxygen during the day through photosynthesis.' },
  ],
  geography: [
    { title: 'Longest river', fact: 'The Nile in Africa and the Amazon in South America are among the longest rivers on Earth.' },
    { title: 'India\'s neighbours', fact: 'India shares land borders with Pakistan, China, Nepal, Bhutan, Bangladesh, and Myanmar.' },
    { title: 'Deserts', fact: 'The Sahara in Africa is the world\'s largest hot desert, while Antarctica is the largest cold desert.' },
    { title: 'Equator', fact: 'Countries on the equator receive direct sunlight year-round and stay warm.' },
  ],
  history: [
    { title: 'Indus Valley', fact: 'The Indus Valley Civilisation had planned cities with drainage systems over 4,000 years ago.' },
    { title: 'Ashoka', fact: 'Emperor Ashoka spread messages of peace and kindness on pillars across ancient India.' },
    { title: 'Printing', fact: 'Movable type printing was developed in China centuries before it spread to Europe.' },
    { title: 'Freedom struggle', fact: 'Mahatma Gandhi led non-violent movements that helped India gain independence in 1947.' },
  ],
  current_affairs: [
    { title: 'Digital India', fact: 'India has one of the world\'s largest digital payment systems, used by millions every day.' },
    { title: 'Space missions', fact: 'ISRO has sent missions to the Moon and Mars, making India a major space-faring nation.' },
    { title: 'Renewable energy', fact: 'India is building large solar and wind farms to produce clean electricity.' },
    { title: 'School education', fact: 'The National Education Policy encourages coding, skills, and critical thinking in schools.' },
  ],
  general_knowledge: [
    { title: 'Olympics', fact: 'The modern Olympic Games bring athletes from almost every country together every four years.' },
    { title: 'Languages', fact: 'India recognises Hindi and English officially, and people speak hundreds of regional languages.' },
    { title: 'Inventions', fact: 'The number zero as we use it in maths was developed in ancient India.' },
    { title: 'Time zones', fact: 'When it is morning in India, it may still be night in the United States because of time zones.' },
  ],
  nature: [
    { title: 'Bees', fact: 'Bees pollinate flowers, which helps plants grow fruits and seeds we eat.' },
    { title: 'Monsoon', fact: 'India\'s monsoon rains fill rivers and help farmers grow rice, wheat, and many crops.' },
    { title: 'Tigers', fact: 'India is home to most of the world\'s wild tigers, protected in national parks.' },
    { title: 'Coral reefs', fact: 'Coral reefs are underwater cities of tiny animals that shelter fish and sea life.' },
  ],
  india: [
    { title: 'Unity', fact: 'India\'s motto "Unity in Diversity" celebrates many religions, languages, and cultures living together.' },
    { title: 'Constitution', fact: 'India\'s Constitution, adopted in 1950, is one of the longest written constitutions in the world.' },
    { title: 'Festivals', fact: 'Diwali, Eid, Christmas, Pongal, and Baisakhi are celebrated across India with joy and lights.' },
    { title: 'Heritage', fact: 'The Taj Mahal, Qutub Minar, and Ajanta caves are UNESCO World Heritage sites in India.' },
  ],
  sports: [
    { title: 'Hockey', fact: 'India won eight Olympic gold medals in men\'s hockey, more than any other country for many years.' },
    { title: 'Cricket', fact: 'Cricket is hugely popular in India; the IPL brings players from around the world each year.' },
    { title: 'Kabaddi', fact: 'Kabaddi is a traditional Indian team sport where players tag opponents and hold their breath.' },
    { title: 'Chess', fact: 'Chess originated in India as a game called chaturanga over 1,500 years ago.' },
  ],
  math: [
    { title: 'Shapes', fact: 'A circle has infinite lines of symmetry through its centre.' },
    { title: 'Prime numbers', fact: 'A prime number has exactly two factors: 1 and itself. Examples: 2, 3, 5, 7, 11.' },
    { title: 'Angles', fact: 'The angles inside any triangle always add up to 180 degrees.' },
    { title: 'Percentages', fact: '50% means half — if 50% of a class of 40 students like maths, that is 20 students.' },
  ],
};

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Pick 10 facts covering all subject areas for a date/grade. */
function getFactsForDate(date, gradeLabel) {
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const seed = hashSeed(`${dateStr}:${gradeLabel}`);
  const facts = [];
  const subjects = DAILY_FACT_SUBJECTS.map((s) => s.id);

  for (let i = 0; i < FACT_COUNT; i += 1) {
    const subjectId = subjects[i % subjects.length];
    const pool = POOL[subjectId] || POOL.general_knowledge;
    const idx = (seed + i * 7) % pool.length;
    const item = pool[idx];
    const meta = DAILY_FACT_SUBJECTS.find((s) => s.id === subjectId);
    facts.push({
      id: `${dateStr}-${i + 1}`,
      subject: subjectId,
      emoji: meta?.emoji || '💡',
      title: item.title,
      fact: item.fact,
    });
  }

  return facts;
}

module.exports = { getFactsForDate, POOL };
