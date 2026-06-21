/** Language puzzle seeds */

function mk(id, puzzleType, classFrom, classTo, difficulty, question, options, answer, explanation) {
  const meta = { Easy: [25, 5], Medium: [60, 10], Hard: [120, 15] };
  const [timeLimit, points] = meta[difficulty] || meta.Easy;
  return {
    id, category: 'Language', puzzleType, classFrom, classTo, difficulty,
    question, options, answer, explanation, timeLimit, points,
  };
}

module.exports = [
  mk('PZ3001', 'Jumbled Words', 1, 5, 'Easy', 'Unscramble: T A C → a pet that says meow', ['CAT', 'ACT', 'TAC', 'ATC'], 'CAT', 'Rearrange T-A-C to spell CAT.'),
  mk('PZ3002', 'Jumbled Words', 2, 5, 'Easy', 'Unscramble: O D G → a pet that barks', ['GOD', 'DOG', 'DGO', 'OGD'], 'DOG', 'D-O-G spells DOG.'),
  mk('PZ3003', 'Synonyms', 4, 10, 'Easy', 'Synonym of "happy"', ['sad', 'joyful', 'angry', 'tired'], 'joyful', 'Joyful means the same as happy.'),
  mk('PZ3004', 'Synonyms', 5, 10, 'Easy', 'Synonym of "big"', ['small', 'large', 'tiny', 'short'], 'large', 'Large is another word for big.'),
  mk('PZ3005', 'Antonyms', 4, 10, 'Easy', 'Antonym of "hot"', ['warm', 'cold', 'sunny', 'bright'], 'cold', 'Hot and cold are opposites.'),
  mk('PZ3006', 'Antonyms', 5, 10, 'Easy', 'Antonym of "begin"', ['start', 'end', 'open', 'first'], 'end', 'Begin and end are opposites.'),
  mk('PZ3007', 'Fill in the Blank', 1, 5, 'Easy', 'The sky is ___.', ['green', 'blue', 'red', 'yellow'], 'blue', 'On a clear day the sky appears blue.'),
  mk('PZ3008', 'Fill in the Blank', 2, 5, 'Easy', 'We read with our ___.', ['ears', 'eyes', 'nose', 'feet'], 'eyes', 'Reading uses our eyes to see words.'),
  mk('PZ3009', 'Crossword', 4, 12, 'Medium', 'Clue: Frozen water (3 letters)', ['ICE', 'SNOW', 'H2O', 'COLD'], 'ICE', 'Ice is water in solid form.'),
  mk('PZ3010', 'Riddles', 3, 12, 'Medium', 'I have keys but no locks. I have space but no room. What am I?', ['A piano', 'A map', 'A book', 'A door'], 'A piano', 'A piano has keys and space between them.'),
  mk('PZ3011', 'Riddles', 4, 12, 'Medium', 'The more you take, the more you leave behind. What are they?', ['money', 'footsteps', 'photos', 'books'], 'footsteps', 'Each step leaves a footprint behind.'),
];
