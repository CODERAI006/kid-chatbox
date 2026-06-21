/** Visual, Coding, Memory, Critical Thinking, Brain Teaser seeds */

function mk(category, id, puzzleType, classFrom, classTo, difficulty, question, options, answer, explanation) {
  const meta = { Easy: [25, 5], Medium: [60, 10], Hard: [120, 15] };
  const [timeLimit, points] = meta[difficulty] || meta.Easy;
  return {
    id, category, puzzleType, classFrom, classTo, difficulty,
    question, options, answer, explanation, timeLimit, points,
  };
}

module.exports = [
  mk('Visual', 'PZ6001', 'Spot the Difference', 1, 8, 'Easy', 'Picture A has 5 stars; Picture B has 4 stars. How many differences in star count?', ['0', '1', '2', '5'], '1', 'One star is missing — count the difference.'),
  mk('Visual', 'PZ6002', 'Mirror Image', 3, 10, 'Medium', 'Letter "b" in a mirror looks like ___?', ['b', 'd', 'p', 'q'], 'd', 'Vertical mirror flips b to d.'),
  mk('Visual', 'PZ6003', 'Shape Rotation', 4, 12, 'Medium', 'A square rotated 90° still looks like a ___.', ['triangle', 'square', 'circle', 'line'], 'square', 'Rotation does not change a square\'s shape.'),
  mk('Visual', 'PZ6004', 'Hidden Object', 1, 8, 'Easy', 'Find the hidden number: "I have 3 apples and 2 oranges." Total fruits?', ['3', '4', '5', '6'], '5', '3 + 2 = 5 fruits total.'),
  mk('Visual', 'PZ6005', 'Cube Counting', 6, 12, 'Hard', 'A 2×2×2 cube is made of unit cubes. How many unit cubes?', ['4', '6', '8', '12'], '8', '2×2×2 = 8 unit cubes.'),
  mk('Coding', 'PZ7001', 'Output Prediction', 8, 12, 'Medium', 'What prints? x=3; print(x*2)', ['3', '5', '6', '9'], '6', '3 multiplied by 2 equals 6.'),
  mk('Coding', 'PZ7002', 'Algorithm Puzzle', 3, 6, 'Easy', 'Steps: 1) Start 2) Add 2 to 5 3) Stop. Result?', ['5', '6', '7', '8'], '7', '5 + 2 = 7 following the algorithm.'),
  mk('Coding', 'PZ7003', 'Debugging Puzzle', 9, 12, 'Medium', 'Bug: if x = 5: print(x + "2") → TypeError. Fix prints?', ['52', '7', '5+2', 'error'], '7', 'Use print(x + 2) for numeric addition → 7.'),
  mk('Coding', 'PZ7004', 'Flowchart Logic', 7, 12, 'Medium', 'Start → Is n even? Yes→print n/2, No→print n+1. n=4. Output?', ['2', '3', '4', '5'], '2', '4 is even, so print 4/2 = 2.'),
  mk('Memory', 'PZ8001', 'Sequence Recall', 1, 6, 'Easy', 'Remember: 2, 4, 6. What comes next?', ['7', '8', '9', '10'], '8', 'Even numbers increasing by 2: next is 8.'),
  mk('Memory', 'PZ8002', 'Image Recall', 1, 6, 'Easy', 'Colors shown: Red, Blue, Green. What was second?', ['Red', 'Blue', 'Green', 'Yellow'], 'Blue', 'The second color in the sequence was Blue.'),
  mk('Critical Thinking', 'PZ9001', 'Real-Life Math Scenario', 4, 10, 'Medium', 'You have ₹50. A book costs ₹35. Change?', ['₹10', '₹15', '₹20', '₹25'], '₹15', '50 − 35 = ₹15 change.'),
  mk('Critical Thinking', 'PZ9002', 'Decision Making Puzzle', 6, 12, 'Medium', 'Rain is forecast. Best choice before school?', ['Wear sandals', 'Take an umbrella', 'Wear sunglasses only', 'Skip homework'], 'Take an umbrella', 'An umbrella protects you from rain.'),
  mk('Brain Teaser', 'PZ9101', 'Lateral Thinking Puzzle', 6, 12, 'Hard', 'A man pushes his car to a hotel and pays. Why?', ['He bought fuel', 'He lost a Monopoly game', 'He rented a room', 'He fixed the car'], 'He lost a Monopoly game', 'Classic lateral puzzle — Monopoly "hotel" property.'),
  mk('Brain Teaser', 'PZ9102', 'Trick Question', 3, 12, 'Easy', 'How many months have 28 days?', ['1', '2', '12', '0'], '12', 'All 12 months have at least 28 days!'),
];
