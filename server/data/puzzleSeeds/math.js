/** Math puzzle seeds — Number Pattern, Missing Number, Magic Square, etc. */

function mk(id, puzzleType, classFrom, classTo, difficulty, question, options, answer, explanation) {
  const meta = { Easy: [25, 5], Medium: [60, 10], Hard: [120, 15] };
  const [timeLimit, points] = meta[difficulty] || meta.Easy;
  return {
    id, category: 'Math', puzzleType, classFrom, classTo, difficulty,
    question, options, answer, explanation, timeLimit, points,
  };
}

module.exports = [
  mk('PZ1001', 'Number Pattern', 3, 8, 'Medium', '2, 6, 12, 20, ?', [28, 30, 32, 34], 30, 'Pattern follows n(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30.'),
  mk('PZ1002', 'Number Pattern', 3, 6, 'Easy', '5, 10, 15, 20, ?', [22, 25, 30, 35], 25, 'Add 5 each time — counting by fives.'),
  mk('PZ1003', 'Number Pattern', 5, 8, 'Medium', '1, 4, 9, 16, ?', [20, 25, 36, 49], 25, 'Perfect squares: 1², 2², 3², 4², 5²=25.'),
  mk('PZ1004', 'Missing Number', 1, 3, 'Easy', '3 + ? = 7', [2, 3, 4, 5], 4, '7 − 3 = 4. Subtraction finds the missing addend.'),
  mk('PZ1005', 'Missing Number', 1, 3, 'Easy', '? + 5 = 9', [3, 4, 5, 6], 4, '9 − 5 = 4.'),
  mk('PZ1006', 'Magic Square', 4, 8, 'Medium', 'Fill the missing corner so each row, column, and diagonal sums to 15:\n8 _ _\n_ 5 _\n_ _ 2', null, 6, 'Classic 3×3 magic square: top-right is 1, bottom-left is 4, center row middle is 9, missing corner is 6.'),
  mk('PZ1007', 'Number Pyramid', 3, 7, 'Medium', 'Top is 20. Row below: 8, ?, 7. Bottom row: 3, 5, 2, 5. Find ?', [5, 6, 7, 8], 5, '8 = 3+5, 7 = 2+5, so middle = 20 − 8 − 7 = 5.'),
  mk('PZ1008', 'Algebra Puzzle', 6, 10, 'Easy', 'If x + 7 = 15, what is x?', [6, 7, 8, 9], 8, 'Subtract 7 from both sides: x = 15 − 7 = 8.'),
  mk('PZ1009', 'Algebra Puzzle', 7, 10, 'Medium', '2x + 3 = 13. Find x.', [4, 5, 6, 7], 5, '2x = 10, so x = 5.'),
  mk('PZ1010', 'Probability Puzzle', 8, 12, 'Medium', 'A bag has 3 red and 2 blue balls. One ball is picked at random. P(red)?', ['3/5', '2/5', '1/2', '3/10'], '3/5', '3 red out of 5 total → P(red) = 3/5.'),
  mk('PZ1011', 'Probability Puzzle', 9, 12, 'Hard', 'Two fair dice are rolled. P(sum = 7)?', ['1/6', '1/12', '1/36', '7/36'], '1/6', 'Six ways to get sum 7 out of 36 outcomes: 6/36 = 1/6.'),
  mk('PZ1012', 'Geometry Puzzle', 6, 12, 'Medium', 'A rectangle has length 8 cm and width 5 cm. What is its area?', ['13 cm²', '26 cm²', '40 cm²', '80 cm²'], '40 cm²', 'Area = length × width = 8 × 5 = 40 cm².'),
  mk('PZ1013', 'Geometry Puzzle', 7, 12, 'Medium', 'How many degrees in the three angles of any triangle?', ['90°', '180°', '270°', '360°'], '180°', 'The interior angles of a triangle always sum to 180°.'),
];
