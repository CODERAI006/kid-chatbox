/** GK, History, Civic Sense, Financial Education & complex Brain Teasers. */

function mk(category, id, puzzleType, classFrom, classTo, difficulty, question, options, answer, explanation) {
  const meta = { Easy: [35, 8], Medium: [75, 12], Hard: [150, 18] };
  const [timeLimit, points] = meta[difficulty] || meta.Medium;
  return {
    id, category, puzzleType, classFrom, classTo, difficulty,
    question, options, answer, explanation, timeLimit, points,
  };
}

module.exports = [
  // GK
  mk('GK', 'PZG001', 'Capital Cities', 4, 12, 'Medium', 'Which city is the capital of Australia?', ['Sydney', 'Canberra', 'Melbourne', 'Perth'], 'Canberra', 'Canberra was chosen as capital in 1908 — a compromise between Sydney and Melbourne.'),
  mk('GK', 'PZG002', 'Flag Identification', 5, 12, 'Medium', 'How many stars are on the flag of the European Union?', ['10', '12', '15', '27'], '12', 'The 12 stars represent unity, solidarity, and harmony among Europeans.'),
  mk('GK', 'PZG003', 'Monument Puzzle', 4, 12, 'Medium', 'The Great Wall was built primarily to protect which country?', ['Japan', 'China', 'Mongolia', 'Korea'], 'China', 'The Great Wall stretches over 21,000 km across northern China.'),
  mk('GK', 'PZG004', 'World Geography', 6, 12, 'Medium', 'Which is the longest river in the world?', ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], 'Nile', 'The Nile flows about 6,650 km through northeastern Africa.'),
  mk('GK', 'PZG005', 'Indian Heritage', 5, 12, 'Medium', 'Khajuraho temples are famous for architecture from which Indian dynasty period?', ['Maurya', 'Chandela', 'Gupta', 'Mughal'], 'Chandela', 'Chandela rulers built these UNESCO temples in Madhya Pradesh.'),

  // History
  mk('History', 'PZH001', 'Indian History', 6, 12, 'Hard', 'The Jallianwala Bagh massacre took place in which year?', ['1919', '1921', '1942', '1857'], '1919', 'On 13 April 1919, troops fired on a peaceful gathering in Amritsar.'),
  mk('History', 'PZH002', 'World History', 7, 12, 'Hard', 'World War II ended in Europe on VE Day in which year?', ['1943', '1944', '1945', '1946'], '1945', 'Victory in Europe Day was 8 May 1945 after Germany surrendered.'),
  mk('History', 'PZH003', 'Indian History', 8, 12, 'Hard', 'Who was the first Prime Minister of independent India?', ['Sardar Patel', 'Jawaharlal Nehru', 'Dr. Ambedkar', 'Rajendra Prasad'], 'Jawaharlal Nehru', 'Nehru served from 1947 to 1964 and shaped modern India.'),
  mk('History', 'PZH004', 'Ancient History', 6, 12, 'Medium', 'The Indus Valley Civilization flourished around which river?', ['Ganga', 'Indus', 'Brahmaputra', 'Narmada'], 'Indus', 'Harappa and Mohenjo-daro were major cities of this bronze-age civilization.'),
  mk('History', 'PZH005', 'Modern History', 9, 12, 'Hard', 'The French Revolution began in which year?', ['1776', '1789', '1815', '1848'], '1789', 'It started with the storming of the Bastille on 14 July 1789.'),

  // Civic Sense
  mk('Civic Sense', 'PZC001', 'Constitution Basics', 6, 12, 'Medium', 'How many fundamental rights are guaranteed to Indian citizens?', ['4', '6', '7', '10'], '6', 'Rights include equality, freedom, religion, culture, education, and constitutional remedies.'),
  mk('Civic Sense', 'PZC002', 'Traffic Rules', 4, 10, 'Medium', 'In India, you must drive on which side of the road?', ['Left', 'Right', 'Centre', 'Either side'], 'Left', 'India follows left-hand traffic — stay in the left lane when driving.'),
  mk('Civic Sense', 'PZC003', 'Democracy', 7, 12, 'Medium', 'Minimum voting age in India for Lok Sabha elections is ___ years.', ['16', '18', '21', '25'], '18', 'The 61st Constitutional Amendment (1989) lowered the age from 21 to 18.'),
  mk('Civic Sense', 'PZC004', 'Environment Duty', 5, 12, 'Medium', 'Which habit best reduces plastic pollution?', ['Burn plastic', 'Reuse bags & bottles', 'Litter in drains', 'Buy more plastic'], 'Reuse bags & bottles', 'Reduce, reuse, recycle — small daily choices protect rivers and oceans.'),
  mk('Civic Sense', 'PZC005', 'Public Safety', 6, 12, 'Medium', 'During a fire emergency, you should first ___?', ['Use elevator', 'Call emergency & use stairs', 'Hide under bed', 'Open all windows in smoke'], 'Call emergency & use stairs', 'Alert others, call 101/112, evacuate via stairs — never use lifts in fire.'),

  // Financial Education
  mk('Financial Education', 'PZF001', 'Saving Habits', 5, 12, 'Medium', 'Putting money in a bank savings account mainly helps you ___?', ['Lose money', 'Earn interest & keep it safe', 'Avoid taxes always', 'Spend faster'], 'Earn interest & keep it safe', 'Banks pay interest and protect deposits — a foundation of financial security.'),
  mk('Financial Education', 'PZF002', 'Budgeting', 6, 12, 'Medium', 'Needs vs wants: Which is a NEED?', ['Latest gaming console', 'Nutritious food', 'Designer shoes', 'Extra streaming app'], 'Nutritious food', 'Needs are essentials for health and survival; wants are optional extras.'),
  mk('Financial Education', 'PZF003', 'Interest Basics', 8, 12, 'Hard', 'Simple interest on ₹1,000 at 10% per year for 2 years equals ___?', ['₹100', '₹200', '₹220', '₹300'], '₹200', 'SI = P×R×T/100 = 1000×10×2/100 = ₹200. Compound interest would be slightly more.'),
  mk('Financial Education', 'PZF004', 'Digital Money', 7, 12, 'Medium', 'UPI payments in India are regulated by ___?', ['RBI', 'ISRO', 'CBSE', 'FIFA'], 'RBI', 'Reserve Bank of India oversees digital payment systems for safety.'),
  mk('Financial Education', 'PZF005', 'Entrepreneurship', 9, 12, 'Hard', 'A business profit equals ___?', ['Revenue + costs', 'Revenue − costs', 'Revenue × costs', 'Costs only'], 'Revenue − costs', 'Profit is what remains after paying all expenses from sales income.'),

  // Complex Brain Teasers
  mk('Brain Teaser', 'PZB001', 'Lateral Thinking Puzzle', 8, 12, 'Hard', 'A man is found dead in a field. No one touched him. No weapons. How?', ['Heart attack', 'Parachute failed to open', 'Snake bite', 'Lightning only'], 'Parachute failed to open', 'He fell from the sky — the empty unopened parachute tells the story.'),
  mk('Brain Teaser', 'PZB002', 'Logic Grid', 9, 12, 'Hard', 'Three boxes: one has gold. Labels all wrong. Box A says "Gold", B says "Silver", C says "Gold or Silver". You open one box and know all contents. Minimum boxes to open?', ['1', '2', '3', '0'], '1', 'Open the box NOT labelled gold/silver combo — since all labels lie, that box\'s content fixes the rest.'),
  mk('Brain Teaser', 'PZB003', 'Number Riddle', 7, 12, 'Hard', 'I am an odd number. Take away a letter and I become even. What number?', ['7', '11', '13', '9'], '7', 'Seven → remove "s" → even (not a standard trick — classic answer is SEVEN→EVEN via letter S). Actually classic: SEVEN minus S = EVEN. Number is 7.'),
  mk('Brain Teaser', 'PZB004', 'Paradox Puzzle', 10, 12, 'Hard', 'Which weighs more: a kilogram of feathers or a kilogram of steel?', ['Feathers', 'Steel', 'Same', 'Depends on humidity'], 'Same', 'Both are 1 kg — only volume differs! A classic trick question.'),
  mk('Brain Teaser', 'PZB005', 'Sequence Logic', 8, 12, 'Hard', 'MON, TUE, WED, THU, ? — What comes next in the pattern of first letters?', ['FRI', 'SAT', 'SUN', 'JAN'], 'FRI', 'Days of the week in order — Friday follows Thursday.'),
];
