/**
 * Idiomatic phrases & expressions for daily and school life.
 * 5 phrases rotate per day — usable inside full sentences (not standalone requests).
 */

const PHRASE_POOLS = {
  basic: [
    { phrase: 'break the ice', meaning: 'To start a conversation and make people feel relaxed.', example: 'The teacher told a joke to break the ice on the first day of school.', context: 'school' },
    { phrase: 'a piece of cake', meaning: 'Something very easy to do.', example: 'The spelling test was a piece of cake because I studied every night.', context: 'school' },
    { phrase: 'hit the books', meaning: 'To study hard.', example: 'I need to hit the books tonight before the science quiz.', context: 'school' },
    { phrase: 'under the weather', meaning: 'Feeling sick or unwell.', example: 'Riya stayed home because she was feeling under the weather.', context: 'daily' },
    { phrase: 'once in a blue moon', meaning: 'Something that happens very rarely.', example: 'Our class gets a free period once in a blue moon.', context: 'school' },
    { phrase: 'on cloud nine', meaning: 'Extremely happy.', example: 'I was on cloud nine when I won the essay competition.', context: 'daily' },
    { phrase: 'call it a day', meaning: 'To stop working and rest.', example: 'After finishing homework, we called it a day and played outside.', context: 'daily' },
    { phrase: 'get the ball rolling', meaning: 'To start an activity or project.', example: 'Let us get the ball rolling on our group presentation.', context: 'school' },
    { phrase: 'in hot water', meaning: 'In trouble because of something you did.', example: 'He was in hot water for forgetting to submit his assignment.', context: 'school' },
    { phrase: 'learn the ropes', meaning: 'To learn how a new job or activity works.', example: 'New students learn the ropes during the first week of school.', context: 'school' },
    { phrase: 'keep your chin up', meaning: 'Stay positive even when things are hard.', example: 'Keep your chin up — you will do better on the next test.', context: 'daily' },
    { phrase: 'the early bird catches the worm', meaning: 'People who start early have an advantage.', example: 'She wakes up early to study because the early bird catches the worm.', context: 'daily' },
  ],
  intermediate: [
    { phrase: 'steal someone\'s thunder', meaning: 'To take attention away from someone else.', example: 'He stole her thunder by announcing his project right after hers.', context: 'school' },
    { phrase: 'bite the bullet', meaning: 'To face something difficult with courage.', example: 'I had to bite the bullet and present first even though I was nervous.', context: 'school' },
    { phrase: 'the ball is in your court', meaning: 'It is your turn to make a decision or take action.', example: 'I sent my suggestions — now the ball is in your court.', context: 'daily' },
    { phrase: 'cost an arm and a leg', meaning: 'Very expensive.', example: 'That art kit costs an arm and a leg, so I saved up for months.', context: 'daily' },
    { phrase: 'burn the midnight oil', meaning: 'To work or study late into the night.', example: 'We burned the midnight oil to finish the history project.', context: 'school' },
    { phrase: 'go the extra mile', meaning: 'To make more effort than expected.', example: 'She went the extra mile by adding charts to her science report.', context: 'school' },
    { phrase: 'hit the nail on the head', meaning: 'To describe something exactly right.', example: 'You hit the nail on the head when you said the chapter was confusing.', context: 'school' },
    { phrase: 'let the cat out of the bag', meaning: 'To reveal a secret by accident.', example: 'He let the cat out of the bag about the surprise class party.', context: 'school' },
    { phrase: 'on the same page', meaning: 'To agree or understand each other.', example: 'Before we start, let us make sure we are on the same page.', context: 'school' },
    { phrase: 'a blessing in disguise', meaning: 'Something bad that turns out to be good.', example: 'Missing the bus was a blessing in disguise — I met my study partner at the stop.', context: 'daily' },
    { phrase: 'get cold feet', meaning: 'To become too nervous to do something.', example: 'She got cold feet right before the debate and almost walked off stage.', context: 'school' },
    { phrase: 'jump on the bandwagon', meaning: 'To join something popular because others are doing it.', example: 'Many students jumped on the bandwagon and started using the new study app.', context: 'school' },
  ],
  advanced: [
    { phrase: 'steal the show', meaning: 'To get the most attention and praise in a performance.', example: 'The youngest actor stole the show in the school play.', context: 'school' },
    { phrase: 'read between the lines', meaning: 'To understand a hidden or implied meaning.', example: 'If you read between the lines, the author is criticizing the policy.', context: 'school' },
    { phrase: 'the elephant in the room', meaning: 'An obvious problem everyone avoids discussing.', example: 'Low attendance was the elephant in the room during the staff meeting.', context: 'school' },
    { phrase: 'turn a blind eye', meaning: 'To deliberately ignore something wrong.', example: 'The coach could not turn a blind eye to cheating during the match.', context: 'school' },
    { phrase: 'play devil\'s advocate', meaning: 'To argue the opposite side to test an idea.', example: 'In debate club, we play devil\'s advocate to strengthen our arguments.', context: 'school' },
    { phrase: 'cut corners', meaning: 'To do something poorly to save time or effort.', example: 'Do not cut corners on your research — teachers notice shallow work.', context: 'school' },
    { phrase: 'move the goalposts', meaning: 'To change the rules after something has started.', example: 'It felt unfair when they moved the goalposts on the project rubric.', context: 'school' },
    { phrase: 'a double-edged sword', meaning: 'Something helpful that can also cause harm.', example: 'Social media is a double-edged sword for students preparing for exams.', context: 'daily' },
    { phrase: 'in the same boat', meaning: 'Facing the same difficult situation as others.', example: 'We are all in the same boat before finals week.', context: 'school' },
    { phrase: 'throw in the towel', meaning: 'To give up on something.', example: 'Even when the experiment failed twice, she refused to throw in the towel.', context: 'school' },
    { phrase: 'walk on eggshells', meaning: 'To be very careful not to upset someone.', example: 'After the argument, everyone walked on eggshells around the team captain.', context: 'daily' },
    { phrase: 'the tip of the iceberg', meaning: 'A small visible part of a much larger problem.', example: 'One late assignment may be the tip of the iceberg for a struggling student.', context: 'school' },
  ],
};

const PHRASES_PER_DAY = 5;

function getPhrasesForDate(date, grade, complexity) {
  const pool = PHRASE_POOLS[complexity] || PHRASE_POOLS.basic;
  const epochDay = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const gradeSeed = grade.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const start = Math.abs(epochDay + gradeSeed * 3) % pool.length;
  const phrases = [];
  for (let i = 0; i < PHRASES_PER_DAY; i++) {
    phrases.push(pool[(start + i) % pool.length]);
  }
  return phrases;
}

module.exports = { PHRASE_POOLS, PHRASES_PER_DAY, getPhrasesForDate };
