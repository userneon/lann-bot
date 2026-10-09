// Ticket types shown in the panel's dropdown. Each one opens a form with its own questions
// (Discord allows at most 5 questions per form). `key` is used in channel names, so keep it
// short, lowercase and unique.
module.exports = [
  {
    key: 'sanal',
    label: 'Санал хүсэлт',
    emoji: '📩',
    description: 'Серверийг сайжруулах санал, шинэ санаа, хүсэлт байвал энд бичнэ үү.',
    questions: [
      { id: 'idea', label: 'Таны санал, хүсэлт', style: 'paragraph' },
    ],
  },
  {
    key: 'unban',
    label: 'Unban хүсэлт',
    emoji: '🚫',
    description: 'Ban авсан бол шалтгаанаа тайлбарлаж, дахин шалгуулах хүсэлт илгээнэ үү.',
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
    questions: [
      { id: 'target', label: 'Хэний талаар гомдол гаргаж байна вэ?', style: 'short' },
      { id: 'details', label: 'Юу болсныг дэлгэрэнгүй бичнэ үү', style: 'paragraph' },
    ],
  },
  {
    key: 'server',
    label: 'Сервер түрээс',
    emoji: '🎮',
    description: 'Сервер түрээстэй холбоотой асуудал байвал дэлгэрэнгүй бичин илгээнэ үү.',
    questions: [
      { id: 'details', label: 'Асуудлаа дэлгэрэнгүй бичнэ үү', style: 'paragraph' },
    ],
  },
  {
    key: 'admin',
    label: 'Админ авах',
    emoji: '🛡️',
    description: 'Админ авах хүсэлт илгээх бол энд даран анкет бөглөнө үү.',
    questions: [
      { id: 'nickname', label: 'Тоглоомын нэр', style: 'short' },
      { id: 'age', label: 'Нас', style: 'short' },
      { id: 'hours', label: 'Өдөрт хэдэн цаг онлайн байдаг вэ?', style: 'short' },
      { id: 'experience', label: 'Өмнө нь админ хийж байсан уу?', style: 'paragraph' },
      { id: 'why', label: 'Яагаад админ болохыг хүсэж байна вэ?', style: 'paragraph' },
    ],
  },
];
