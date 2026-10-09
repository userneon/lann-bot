// Ticket types shown in the panel's dropdown. Each one opens a form with its own questions
// (Discord allows at most 5 questions per form, and a form title of at most 45 characters).
// `key` is used in channel names, so keep it short, lowercase and unique.
module.exports = [
  {
    key: 'sanal',
    label: 'Санал хүсэлт',
    emoji: '📩',
    description: 'Серверийг сайжруулах санал, шинэ санаа, хүсэлт байвал энд бичнэ үү.',
    formTitle: 'САНАЛ ХҮСЭЛТ',
    questions: [
      { id: 'idea', label: 'Санал хүсэлтээ тодорхой бичнэ үү', placeholder: 'санал хүсэлт' },
    ],
  },
  {
    key: 'unban',
    label: 'Unban хүсэлт',
    emoji: '🚫',
    description: 'Ban авсан бол шалтгаанаа тайлбарлаж, дахин шалгуулах хүсэлт илгээнэ үү.',
    formTitle: 'UNBAN ХҮСЭЛТ',
    questions: [
      { id: 'nickname', label: 'Тоглоомын нэр', style: 'short' },
      { id: 'reason', label: 'Ban авсан шалтгаан', style: 'paragraph' },
      { id: 'appeal', label: 'Яагаад unban хийх ёстой гэж үзэж байна вэ?', style: 'paragraph' },
    ],
  },
  {
    key: 'gomdol',
    label: 'Гомдол',
    emoji: '🚨',
    description: 'Хэрэглэгч эсвэл админтай холбоотой асуудал, зөрчлийг дэлгэрэнгүй бичиж илгээнэ үү.',
    formTitle: 'САНАЛ ГОМДОЛ',
    questions: [
      { id: 'target', label: 'Та хэнд гомдол гаргаж байна вэ?', placeholder: 'STEAM Account Link аль эсвэл Нэр' },
      { id: 'reason', label: 'Гомдол гаргаж буй шалтгаан', placeholder: 'шалтгаан' },
    ],
  },
  {
    key: 'server',
    label: 'Сервер түрээс',
    emoji: '🎮',
    description: 'Сервер түрээстэй холбоотой асуудал байвал дэлгэрэнгүй бичин илгээнэ үү.',
    formTitle: 'СЕРВЕР ТҮРЭЭС',
    questions: [
      { id: 'details', label: 'Асуудлаа дэлгэрэнгүй бичнэ үү', style: 'paragraph' },
    ],
  },
  {
    key: 'admin',
    label: 'Админ авах',
    emoji: '🛡️',
    description: 'Админ авах хүсэлт илгээх бол энд даран анкет бөглөнө үү.',
    formTitle: 'TEST ADMIN - 100,000₮ ROYAL ADMIN - Нууц',
    questions: [
      { id: 'type', label: 'Та ямар админ авах вэ?', placeholder: 'ROYAL, TEST....' },
      { id: 'nickname', label: 'Тоглодог нэр', placeholder: 'нэр' },
      { id: 'age', label: 'Таны нас', placeholder: 'нас' },
      { id: 'steam', label: 'STEAM ACCOUNT LINK', placeholder: 'https://steamcommunity.com/profiles/*****************' },
      { id: 'server', label: 'ADMIN авах сервер', placeholder: 'MATCH, PUBLIC, RETAKE, KZ, SURF, HNS' },
    ],
  },
];
