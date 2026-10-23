// Scholar biographies for the Ilm Daily Hadith library.
// Shape: one record per scholar, keyed by collection id for easy linking.

const SCHOLARS = [
  {
    id: "bukhari",
    name: "Imam al-Bukhari",
    fullName: "Muhammad ibn Ismail al-Bukhari",
    collection: "Sahih al-Bukhari",
    birthYear: 810,
    deathYear: 870,
    birthPlace: "Bukhara (present-day Uzbekistan)",
    bio: "His Sahih al-Bukhari is widely regarded as the most authentic book after the Quran. He selected it from around 600,000 narrations over 16 years of travel across the Muslim world.",
    teachers: ["Ishaq ibn Rahawayh"],
    students: ["Imam Muslim", "Imam al-Tirmidhi"],
  },
  {
    id: "muslim",
    name: "Imam Muslim",
    fullName: "Muslim ibn al-Hajjaj al-Nishapuri",
    collection: "Sahih Muslim",
    birthYear: 815,
    deathYear: 875,
    birthPlace: "Nishapur, Persia",
    bio: "A student of al-Bukhari. His Sahih Muslim is prized for its meticulous arrangement and consistent narrator methodology.",
    teachers: ["Imam al-Bukhari"],
    students: [],
  },
  {
    id: "abudawud",
    name: "Imam Abu Dawud",
    fullName: "Sulayman ibn al-Ash'ath al-Sijistani",
    collection: "Sunan Abu Dawud",
    birthYear: 817,
    deathYear: 889,
    birthPlace: "Sijistan, Persia",
    bio: "His Sunan focuses on legal hadith; out of roughly 500,000 narrations he recorded about 4,800, noting the legal rulings each supports.",
    teachers: ["Imam Ahmad ibn Hanbal"],
    students: ["Imam al-Tirmidhi", "Imam al-Nasa'i"],
  },
  {
    id: "tirmidhi",
    name: "Imam al-Tirmidhi",
    fullName: "Muhammad ibn Isa al-Tirmidhi",
    collection: "Jami' al-Tirmidhi",
    birthYear: 824,
    deathYear: 892,
    birthPlace: "Tirmidh, on the Oxus river",
    bio: "A student of al-Bukhari. His Jami' grades each hadith and explains the juristic differences among schools — one of the earliest works of comparative fiqh.",
    teachers: ["Imam al-Bukhari", "Imam Abu Dawud"],
    students: [],
  },
  {
    id: "nasai",
    name: "Imam al-Nasa'i",
    fullName: "Ahmad ibn Shu'ayb al-Nasa'i",
    collection: "Sunan al-Nasa'i",
    birthYear: 829,
    deathYear: 915,
    birthPlace: "Nasa, Khurasan",
    bio: "His Sunan al-Nasa'i (al-Mujtaba) is considered by many scholars the most rigorously graded of the four Sunan.",
    teachers: ["Imam Abu Dawud"],
    students: [],
  },
  {
    id: "ibnmajah",
    name: "Imam Ibn Majah",
    fullName: "Muhammad ibn Yazid Ibn Majah",
    collection: "Sunan Ibn Majah",
    birthYear: 824,
    deathYear: 887,
    birthPlace: "Qazvin, Persia",
    bio: "His Sunan completed the canonical six; it added hadiths the others missed and includes one of the earliest historical sections on the Prophet's life.",
    teachers: [],
    students: [],
  },
  {
    id: "malik",
    name: "Imam Malik",
    fullName: "Malik ibn Anas",
    collection: "Muwatta Malik",
    birthYear: 711,
    deathYear: 795,
    birthPlace: "Madinah",
    bio: "His Muwatta is the earliest surviving hadith-and-law compilation and the foundational text of the Maliki school. He taught in Madinah for decades.",
    teachers: [],
    students: ["Imam al-Shafi'i"],
  },
  {
    id: "hanbal",
    name: "Imam Ahmad ibn Hanbal",
    fullName: "Ahmad ibn Hanbal",
    collection: "Musnad Ahmad",
    birthYear: 780,
    deathYear: 855,
    birthPlace: "Baghdad",
    bio: "His Musnad arranges hadiths by the companion who narrated them, with nearly 30,000 narrations. He endured persecution under the Mihna and is the founder of the Hanbali school.",
    teachers: ["Imam al-Shafi'i"],
    students: ["Imam al-Bukhari", "Imam Muslim", "Imam Abu Dawud"],
  },
];

// Helper: get a scholar by collection id
function getScholarByCollection(collectionId) {
  return SCHOLARS.find((s) => s.id === collectionId) || null;
}

// Helper: display range e.g. "810 – 870 CE"
function formatScholarYears(s) {
  return s.birthYear + " – " + s.deathYear + " CE";
}
