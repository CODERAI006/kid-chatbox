/**
 * Common daily & school-life phrases by complexity level.
 * 5 phrases rotate per day using the same date+grade seed pattern.
 */

const PHRASE_POOLS = {
  basic: [
    { phrase: 'Good morning, teacher!', meaning: 'A polite greeting at the start of class.', example: 'Good morning, teacher! I am ready to learn.', context: 'school' },
    { phrase: 'May I go to the restroom?', meaning: 'Asking permission politely to leave class.', example: 'Excuse me, may I go to the restroom?', context: 'school' },
    { phrase: 'I do not understand.', meaning: 'Telling someone you need more help.', example: 'I do not understand this math problem.', context: 'school' },
    { phrase: 'Can you help me, please?', meaning: 'Asking for help in a polite way.', example: 'Can you help me, please? I am stuck on question three.', context: 'daily' },
    { phrase: 'Thank you very much.', meaning: 'Showing gratitude to someone.', example: 'Thank you very much for explaining it again.', context: 'daily' },
    { phrase: 'See you tomorrow!', meaning: 'Saying goodbye until the next day.', example: 'See you tomorrow! Have a nice evening.', context: 'daily' },
    { phrase: 'I finished my homework.', meaning: 'Letting someone know your work is done.', example: 'Mom, I finished my homework before dinner.', context: 'school' },
    { phrase: 'What time is lunch?', meaning: 'Asking when the meal break starts.', example: 'What time is lunch today?', context: 'school' },
    { phrase: 'Nice to meet you.', meaning: 'A friendly greeting when meeting someone new.', example: 'Hi, I am Sam. Nice to meet you!', context: 'daily' },
    { phrase: 'I am sorry.', meaning: 'Apologizing when you make a mistake.', example: 'I am sorry I was late to class.', context: 'daily' },
  ],
  intermediate: [
    { phrase: 'Could you clarify that for me?', meaning: 'Asking someone to explain more clearly.', example: 'Could you clarify that for me? I am confused about step two.', context: 'school' },
    { phrase: 'I would like to volunteer.', meaning: 'Offering to take part in an activity.', example: 'I would like to volunteer for the science fair.', context: 'school' },
    { phrase: 'Let us work together on this.', meaning: 'Suggesting teamwork on a task.', example: 'Let us work together on this group project.', context: 'school' },
    { phrase: 'I need an extension on the deadline.', meaning: 'Requesting more time to finish work.', example: 'I need an extension on the deadline because I was sick.', context: 'school' },
    { phrase: 'That makes a lot of sense.', meaning: 'Agreeing that something is clear and logical.', example: 'Oh, that makes a lot of sense now!', context: 'daily' },
    { phrase: 'I will catch up after class.', meaning: 'Promising to get missing information later.', example: 'I missed the start — I will catch up after class.', context: 'school' },
    { phrase: 'Could we reschedule our meeting?', meaning: 'Asking to change a planned meeting time.', example: 'Could we reschedule our meeting to Thursday?', context: 'daily' },
    { phrase: 'I appreciate your feedback.', meaning: 'Thanking someone for their comments or advice.', example: 'I appreciate your feedback on my essay.', context: 'school' },
    { phrase: 'Let me double-check my answer.', meaning: 'Reviewing your work before submitting.', example: 'Let me double-check my answer before I hand it in.', context: 'school' },
    { phrase: 'I am running a bit late.', meaning: 'Informing someone you will arrive after the expected time.', example: 'I am running a bit late — please start without me.', context: 'daily' },
  ],
  advanced: [
    { phrase: 'I would like to elaborate on my point.', meaning: 'Requesting to explain your idea in more detail.', example: 'May I elaborate on my point about climate change?', context: 'school' },
    { phrase: 'That is a compelling argument.', meaning: 'Recognizing that someone made a strong, persuasive case.', example: 'That is a compelling argument — I had not considered that view.', context: 'school' },
    { phrase: 'I take full responsibility for the error.', meaning: 'Accepting blame for a mistake honestly.', example: 'I take full responsibility for the error in our report.', context: 'daily' },
    { phrase: 'Let us brainstorm some alternatives.', meaning: 'Suggesting a creative discussion of other options.', example: 'Let us brainstorm some alternatives before we decide.', context: 'school' },
    { phrase: 'I would appreciate a second opinion.', meaning: 'Asking someone else to review or advise.', example: 'I would appreciate a second opinion on my presentation slides.', context: 'daily' },
    { phrase: 'We need to prioritize our tasks.', meaning: 'Deciding which jobs are most important first.', example: 'We need to prioritize our tasks before the exam week.', context: 'school' },
    { phrase: 'I am inclined to agree with you.', meaning: 'Expressing that you mostly share someone\'s view.', example: 'I am inclined to agree with you on this interpretation.', context: 'school' },
    { phrase: 'Could you provide some constructive criticism?', meaning: 'Asking for helpful, improvement-focused feedback.', example: 'Could you provide some constructive criticism on my draft?', context: 'school' },
    { phrase: 'Let us summarize the key takeaways.', meaning: 'Recapping the most important points.', example: 'Before we leave, let us summarize the key takeaways from today.', context: 'school' },
    { phrase: 'I will follow up with you shortly.', meaning: 'Promising to get back to someone soon.', example: 'I will follow up with you shortly after I check the details.', context: 'daily' },
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
