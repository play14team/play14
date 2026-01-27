import type { DebriefingCard, Lens, LensId } from "@/models/debriefing-cube"

export const lenses: Lens[] = [
  {
    id: "goal",
    name: "Goal",
    color: "#0099cc",
    colorDark: "#33b5e5",
    icon: "bx-target-lock",
    description: "Explore how it began and their understanding of the goal",
  },
  {
    id: "process",
    name: "Process",
    color: "#e6b800",
    colorDark: "#ffd633",
    icon: "bx-git-branch",
    description: "Explore the series of events that happened",
  },
  {
    id: "group-dynamics",
    name: "Group dynamics",
    color: "#40b4b4",
    colorDark: "#5fcfcf",
    icon: "bx-group",
    description: "Explore behaviours they observed in themselves and from others",
  },
  {
    id: "communication",
    name: "Communication",
    color: "#8888cc",
    colorDark: "#a5a5e0",
    icon: "bx-conversation",
    description: "Explore what they thought, heard and said",
  },
  {
    id: "emotions",
    name: "Emotions",
    color: "#cc4466",
    colorDark: "#e66688",
    icon: "bx-heart",
    description: "Explore their feelings and the impact on what happened",
  },
  {
    id: "take-away",
    name: "Take-away",
    color: "#7ab55c",
    colorDark: "#95d077",
    icon: "bx-bulb",
    description: "Explore what they found interesting, insightful or inspirational",
  },
]

export const cards: DebriefingCard[] = [
  // Goal cards (Blue)
  {
    id: "goal-1",
    lensId: "goal",
    mainQuestion: "What was your goal? Phrase it in one sentence.",
    followUpQuestions: [
      "Did anyone have a different goal?",
      "Why was there a difference?",
      "Did this make a difference?",
    ],
  },
  {
    id: "goal-2",
    lensId: "goal",
    mainQuestion: "What would you have liked to have known beforehand?",
    followUpQuestions: [
      "How would this have helped?",
      "Where was the information needed?",
      "What stopped you from getting it?",
    ],
  },
  {
    id: "goal-3",
    lensId: "goal",
    mainQuestion: "How did you align on the goal?",
    followUpQuestions: [
      "What made the alignment easy/hard?",
      "Did everyone agree?",
      "Doing it again, how would you align differently?",
    ],
  },
  {
    id: "goal-4",
    lensId: "goal",
    mainQuestion: "Was there a shared understanding of the goal?",
    followUpQuestions: [
      "How did you reach the shared understanding?",
      "Would a shared understanding have helped?",
      "Did everyone agree?",
    ],
  },
  {
    id: "goal-5",
    lensId: "goal",
    mainQuestion: "How is your understanding of the goal different now?",
    followUpQuestions: [
      "How did your awareness change?",
      "What did you learn?",
      "How would the experience change, if you knew this beforehand?",
    ],
  },
  {
    id: "goal-6",
    lensId: "goal",
    mainQuestion: "How did you start?",
    followUpQuestions: ["Was everyone aware?", "Did you have to stop and restart?", "What helped?"],
  },
  {
    id: "goal-7",
    lensId: "goal",
    mainQuestion: "What was most challenging?",
    followUpQuestions: [
      "Why?",
      "Who in the room was best equipped to meet this challenge?",
      "What did this experience teach you about your day-to-day?",
    ],
  },

  // Process cards (Yellow)
  {
    id: "process-1",
    lensId: "process",
    mainQuestion: "What steps were taken?",
    followUpQuestions: [
      "Why?",
      "Who in the room was best equipped to meet this challenge?",
      "What did this experience teach you about your day-to-day?",
    ],
  },
  {
    id: "process-2",
    lensId: "process",
    mainQuestion: "Did you assume anything that turned out to be wrong?",
    followUpQuestions: ["What was your assumption?", "What led to this?", "Why was it wrong?"],
  },
  {
    id: "process-3",
    lensId: "process",
    mainQuestion: "What was the defining moment that changed things?",
    followUpQuestions: [
      "What was the impact?",
      "Could this have happened earlier?",
      "What would have been different?",
    ],
  },
  {
    id: "process-4",
    lensId: "process",
    mainQuestion: "How could you have made the process more/less pleasant?",
    followUpQuestions: [
      "What would you have done differently?",
      "How would this have changed the experience?",
      "Would there have been a different result?",
    ],
  },
  {
    id: "process-5",
    lensId: "process",
    mainQuestion: "What decisions did you make?",
    followUpQuestions: [
      "How did you decide?",
      "Why did you need to decide?",
      "Was it a good or bad decision?",
    ],
  },
  {
    id: "process-6",
    lensId: "process",
    mainQuestion: "What ideas, innovation or changes emerged?",
    followUpQuestions: [
      "Where did they come from?",
      "How effective were they?",
      "What surprised you?",
    ],
  },
  {
    id: "process-7",
    lensId: "process",
    mainQuestion: "What reminded you of your day-to-day?",
    followUpQuestions: [
      "How is this similar?",
      "What is the impact?",
      "What did this experience teach you?",
    ],
  },

  // Group Dynamics cards (Teal)
  {
    id: "group-dynamics-1",
    lensId: "group-dynamics",
    mainQuestion: "How did you organize yourselves?",
    followUpQuestions: [
      "Who was leading/facilitating?",
      "Who was following?",
      "How did you make decisions?",
    ],
  },
  {
    id: "group-dynamics-2",
    lensId: "group-dynamics",
    mainQuestion: "Did something unpredictable happen?",
    followUpQuestions: [
      "What was unpredictable?",
      "Did you want to control/avoid this?",
      "How & why?",
    ],
  },
  {
    id: "group-dynamics-3",
    lensId: "group-dynamics",
    mainQuestion: "What changes in group dynamics did you experience?",
    followUpQuestions: [
      "What caused this change?",
      "How did this impact your experience?",
      "Was everybody aware of this change?",
    ],
  },
  {
    id: "group-dynamics-4",
    lensId: "group-dynamics",
    mainQuestion: "How was the participation distributed?",
    followUpQuestions: ["Was everybody included?", "How did you achieve this?", "Was this ideal?"],
  },
  {
    id: "group-dynamics-5",
    lensId: "group-dynamics",
    mainQuestion: "How could you have worked together better?",
    followUpQuestions: [
      "How would this have helped?",
      "When did you realize this was an option?",
      "What stopped you?",
    ],
  },
  {
    id: "group-dynamics-6",
    lensId: "group-dynamics",
    mainQuestion: "What interesting behaviours did you observe?",
    followUpQuestions: ["Why was this interesting to you?", "What was/wasn't helpful?", "Why?"],
  },
  {
    id: "group-dynamics-7",
    lensId: "group-dynamics",
    mainQuestion: "Where have you encountered similar behaviours?",
    followUpQuestions: [
      "Describe the similarity",
      "Is there a similar impact?",
      "What did this experience teach you about your day-to-day?",
    ],
  },

  // Communication cards (Purple)
  {
    id: "communication-1",
    lensId: "communication",
    mainQuestion: "What didn't you say, that you wish you had?",
    followUpQuestions: [
      "What stopped you from saying it?",
      "What would have been different if said?",
      "What question would you have liked to ask yourself/the team?",
    ],
  },
  {
    id: "communication-2",
    lensId: "communication",
    mainQuestion: "What non-verbal communication was there?",
    followUpQuestions: [
      "What was the impact on you and the group?",
      "Could others have interpreted this differently?",
      "How could you be certain?",
    ],
  },
  {
    id: "communication-3",
    lensId: "communication",
    mainQuestion: "What did this teach you about great communication?",
    followUpQuestions: [
      "What was great about it?",
      "How would you teach this to others?",
      "List your top five communication take-aways!",
    ],
  },
  {
    id: "communication-4",
    lensId: "communication",
    mainQuestion: "What miscommunications were there?",
    followUpQuestions: [
      "What were the causes?",
      "How did this impact the experience?",
      "How could you have communicated better?",
    ],
  },
  {
    id: "communication-5",
    lensId: "communication",
    mainQuestion: "Did you communicate enough?",
    followUpQuestions: [
      "Why?",
      "How would more/less communication have impacted your experience?",
      "Did anything stop you from communicating more or less?",
    ],
  },
  {
    id: "communication-6",
    lensId: "communication",
    mainQuestion: "Doing it again, how would you communicate differently?",
    followUpQuestions: [
      "What would be the impact on you/others?",
      "Why didn't this happen earlier?",
      "What would have helped you realise?",
    ],
  },
  {
    id: "communication-7",
    lensId: "communication",
    mainQuestion: "What is left unspoken?",
    followUpQuestions: [
      "How did you notice?",
      "Would speaking about it have helped?",
      "What did this experience teach you about your day-to-day?",
    ],
  },

  // Emotions cards (Pink)
  {
    id: "emotions-1",
    lensId: "emotions",
    mainQuestion: "What did you like or dislike about the experience?",
    followUpQuestions: ["What specifically?", "Why?", "What else?"],
  },
  {
    id: "emotions-2",
    lensId: "emotions",
    mainQuestion: "Where have you observed similar emotions and behaviours?",
    followUpQuestions: [
      "Where did it happen (work/private life)?",
      "How was it similar?",
      "What happened?",
    ],
  },
  {
    id: "emotions-3",
    lensId: "emotions",
    mainQuestion: "When did you care most/least about the outcome?",
    followUpQuestions: [
      "What made you care more/less?",
      "Did anybody feel the same way?",
      "How strongly did you feel about it?",
    ],
  },
  {
    id: "emotions-4",
    lensId: "emotions",
    mainQuestion: "What else would you like to share?",
    followUpQuestions: [
      "What did you learn about other people's emotions?",
      "Did empathy play a role?",
      "What did this experience teach you about your day-to-day?",
    ],
  },
  {
    id: "emotions-5",
    lensId: "emotions",
    mainQuestion: "How did you feel?",
    followUpQuestions: [
      "Were others aware that you felt that way?",
      "What led to this feeling?",
      "How did you feel before?",
    ],
  },
  {
    id: "emotions-6",
    lensId: "emotions",
    mainQuestion: "What was this experience like?",
    followUpQuestions: [
      "Describe with a #hashtag!",
      "What about it made it like this?",
      "What would be a good comparison?",
    ],
  },
  {
    id: "emotions-7",
    lensId: "emotions",
    mainQuestion: "How did you deal with your emotions?",
    followUpQuestions: [
      "Which emotions exactly?",
      "Has this happened to you before?",
      "Did anybody else notice?",
    ],
  },

  // Take-away cards (Green)
  {
    id: "take-away-1",
    lensId: "take-away",
    mainQuestion: "What does this experience remind you of in your day-to-day?",
    followUpQuestions: [
      "How was this similar?",
      "What insights does this give you?",
      "Does this present any opportunities?",
    ],
  },
  {
    id: "take-away-2",
    lensId: "take-away",
    mainQuestion: "What did you learn about yourself and the team?",
    followUpQuestions: [
      "Was this a surprise?",
      "What would you share with others?",
      "Phrase it as a slogan or a motto!",
    ],
  },
  {
    id: "take-away-3",
    lensId: "take-away",
    mainQuestion: "What did you do that will be beneficial in your day-to-day life?",
    followUpQuestions: [
      "What would you like to happen?",
      "What first steps could you take?",
      "How would you know that you are succeeding?",
    ],
  },
  {
    id: "take-away-4",
    lensId: "take-away",
    mainQuestion: "What are you more aware of now?",
    followUpQuestions: [
      "How will you remember this tomorrow?",
      "Does this inspire you?",
      "How will you use this inspiration to help you or your team?",
    ],
  },
  {
    id: "take-away-5",
    lensId: "take-away",
    mainQuestion: "What are the top 5 things you will take away?",
    followUpQuestions: [
      "What inspired your top 5?",
      "What are you going to do with them?",
      "How will you share with others?",
    ],
  },
  {
    id: "take-away-6",
    lensId: "take-away",
    mainQuestion: "If you had a magic wand what one thing would you change?",
    followUpQuestions: ["Why?", "Why?", "Why?"],
  },
  {
    id: "take-away-7",
    lensId: "take-away",
    mainQuestion: "What would an expert make of your experience?",
    followUpQuestions: [
      "How would they summarize it in five words?",
      "What would the expert suggest?",
      "What did this experience teach you about your day-to-day?",
    ],
  },
]

export function getLensById(id: LensId): Lens | undefined {
  return lenses.find((lens) => lens.id === id)
}

export function getCardsByLens(lensId: LensId): DebriefingCard[] {
  return cards.filter((card) => card.lensId === lensId)
}

export function getCardById(id: string): DebriefingCard | undefined {
  return cards.find((card) => card.id === id)
}
