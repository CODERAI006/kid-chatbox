/** Science + GK puzzle seeds */

function sci(id, puzzleType, classFrom, classTo, difficulty, question, options, answer, explanation) {
  const meta = { Easy: [25, 5], Medium: [60, 10], Hard: [120, 15] };
  const [timeLimit, points] = meta[difficulty] || meta.Easy;
  return {
    id, category: 'Science', puzzleType, classFrom, classTo, difficulty,
    question, options, answer, explanation, timeLimit, points,
  };
}

function gk(id, puzzleType, classFrom, classTo, difficulty, question, options, answer, explanation) {
  const meta = { Easy: [25, 5], Medium: [60, 10], Hard: [120, 15] };
  const [timeLimit, points] = meta[difficulty] || meta.Easy;
  return {
    id, category: 'GK', puzzleType, classFrom, classTo, difficulty,
    question, options, answer, explanation, timeLimit, points,
  };
}

module.exports = [
  sci('PZ4001', 'Animal Puzzle', 3, 8, 'Easy', 'Which animal is a mammal?', ['Shark', 'Dolphin', 'Trout', 'Octopus'], 'Dolphin', 'Dolphins breathe air and feed milk to young — mammals.'),
  sci('PZ4002', 'Animal Puzzle', 4, 8, 'Medium', 'Which bird cannot fly?', ['Eagle', 'Penguin', 'Crow', 'Sparrow'], 'Penguin', 'Penguins are flightless birds adapted to swim.'),
  sci('PZ4003', 'Human Body Puzzle', 3, 8, 'Easy', 'Which organ pumps blood?', ['Lungs', 'Heart', 'Stomach', 'Brain'], 'Heart', 'The heart pumps blood through the body.'),
  sci('PZ4004', 'Human Body Puzzle', 4, 8, 'Easy', 'We breathe using our ___.', ['lungs', 'kidneys', 'bones', 'skin'], 'lungs', 'Lungs take in oxygen when we breathe.'),
  sci('PZ4005', 'Physics Logic', 8, 12, 'Medium', 'A ball thrown upward slows down due to ___.', ['magnetism', 'gravity', 'light', 'sound'], 'gravity', 'Gravity pulls the ball downward, slowing upward motion.'),
  sci('PZ4006', 'Chemistry Puzzle', 6, 12, 'Easy', 'Water is made of hydrogen and ___.', ['carbon', 'oxygen', 'nitrogen', 'iron'], 'oxygen', 'H₂O = two hydrogen + one oxygen.'),
  sci('PZ4007', 'Chemistry Puzzle', 7, 12, 'Medium', 'Which state of matter has a fixed shape?', ['gas', 'liquid', 'solid', 'plasma'], 'solid', 'Solids keep their shape; liquids and gases flow.'),
  sci('PZ4008', 'Food Chain Puzzle', 4, 8, 'Easy', 'Grass → Rabbit → ?', ['Sun', 'Fox', 'Rock', 'Water'], 'Fox', 'Fox eats rabbit; rabbit eats grass.'),
  gk('PZ5001', 'Flag Identification', 4, 12, 'Easy', 'Which country has a flag with saffron, white, green and a blue wheel?', ['USA', 'India', 'Japan', 'Brazil'], 'India', 'India\'s flag has the Ashoka Chakra on white.'),
  gk('PZ5002', 'Monument Puzzle', 3, 12, 'Easy', 'The Taj Mahal is in which city?', ['Delhi', 'Agra', 'Mumbai', 'Jaipur'], 'Agra', 'The Taj Mahal stands in Agra, Uttar Pradesh.'),
  gk('PZ5003', 'Capital Cities', 4, 12, 'Easy', 'Capital of France?', ['London', 'Paris', 'Rome', 'Berlin'], 'Paris', 'Paris is the capital of France.'),
  gk('PZ5004', 'Capital Cities', 5, 12, 'Easy', 'Capital of Japan?', ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], 'Tokyo', 'Tokyo is Japan\'s capital.'),
  gk('PZ5005', 'Historical Event Puzzle', 6, 12, 'Medium', 'India gained independence in which year?', ['1945', '1947', '1950', '1942'], '1947', 'India became independent on 15 August 1947.'),
];
