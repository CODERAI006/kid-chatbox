/** Logic puzzle seeds */

function mk(id, puzzleType, classFrom, classTo, difficulty, question, options, answer, explanation) {
  const meta = { Easy: [25, 5], Medium: [60, 10], Hard: [120, 15] };
  const [timeLimit, points] = meta[difficulty] || meta.Easy;
  return {
    id, category: 'Logic', puzzleType, classFrom, classTo, difficulty,
    question, options, answer, explanation, timeLimit, points,
  };
}

module.exports = [
  mk('PZ2001', 'Odd One Out', 1, 5, 'Easy', 'Which does NOT belong? 🍎 🍌 🍊 🚗', ['🍎', '🍌', '🍊', '🚗'], '🚗', 'Apple, banana, and orange are fruits; a car is not.'),
  mk('PZ2002', 'Odd One Out', 2, 5, 'Easy', 'Odd one out: Circle, Square, Triangle, Dog', ['Circle', 'Square', 'Triangle', 'Dog'], 'Dog', 'The first three are shapes; Dog is an animal.'),
  mk('PZ2003', 'Pattern Recognition', 1, 5, 'Easy', '🔴 🔵 🔴 🔵 🔴 ?', ['🔴', '🔵', '🟢', '🟡'], '🔵', 'Colors alternate red and blue.'),
  mk('PZ2004', 'Pattern Recognition', 2, 5, 'Easy', '△ ○ △ ○ △ ?', ['△', '○', '□', '☆'], '○', 'Triangle and circle repeat.'),
  mk('PZ2005', 'Analogy', 3, 8, 'Easy', 'Bird : Nest :: Bee : ?', ['Hive', 'Tree', 'Flower', 'Honey'], 'Hive', 'A bird lives in a nest; a bee lives in a hive.'),
  mk('PZ2006', 'Analogy', 4, 8, 'Easy', 'Hot : Cold :: Day : ?', ['Night', 'Sun', 'Light', 'Morning'], 'Night', 'Hot and cold are opposites; day and night are opposites.'),
  mk('PZ2007', 'Coding-Decoding', 6, 12, 'Medium', 'If CAT = 3120 (C=3, A=1, T=20), what is DOG?', ['4157', '415', '457', '4150'], '4157', 'D=4, O=15, G=7 → 4157 using letter positions.'),
  mk('PZ2008', 'Blood Relations', 5, 10, 'Easy', 'Ravi is Meera\'s father. Meera is Ravi\'s ___?', ['daughter', 'mother', 'sister', 'aunt'], 'daughter', 'A father\'s child is his daughter (or son).'),
  mk('PZ2009', 'Direction Sense', 6, 12, 'Medium', 'Face North, turn right, then right again. Which direction now?', ['North', 'South', 'East', 'West'], 'South', 'North → East (right) → South (right again).'),
  mk('PZ2010', 'Seating Arrangement', 7, 12, 'Hard', 'A, B, C sit in a row. A is not at either end. B is left of C. Order left to right?', ['B-A-C', 'C-A-B', 'B-C-A', 'A-B-C'], 'B-A-C', 'A in middle; B left of C → B-A-C.'),
  mk('PZ2011', 'Syllogism', 8, 12, 'Medium', 'All dogs are animals. Max is a dog. Therefore Max is ___?', ['an animal', 'not an animal', 'a cat', 'unknown'], 'an animal', 'If all dogs are animals and Max is a dog, Max must be an animal.'),
];
