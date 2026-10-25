require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mysql = require("mysql2/promise");

const programs = {
  BSBA: [
    [
      ["Introduction to Business", "Principles of Management", "Business Mathematics", "Financial Accounting 1"],
      ["Marketing Principles", "Microeconomics", "Business Communication", "Financial Accounting 2"],
    ],
    [
      ["Human Resource Management", "Operations Management", "Business Statistics", "Cost Accounting"],
      ["Consumer Behavior", "Business Finance", "Taxation", "Management Information Systems"],
    ],
    [
      ["Strategic Management", "Entrepreneurship", "Business Research Methods", "Labor Relations"],
      ["Marketing Management", "Financial Management", "Production and Operations Planning", "Business Law"],
    ],
    [
      ["Feasibility Study", "Investment and Portfolio Management", "Quality Management", "Strategic Human Resource Management"],
      ["Business Policy and Strategy", "Business Research 2", "Business Simulation", "Business Internship"],
    ],
  ],

  BSIT: [
    [
      ["Introduction to Computing", "Computer Programming 1", "Computer Systems and Organization", "Discrete Mathematics"],
      ["Computer Programming 2", "Web Systems and Technologies", "Data Structures and Algorithms", "Platform Technologies"],
    ],
    [
      ["Object-Oriented Programming", "Database Management Systems 1", "Networking 1", "Systems Analysis and Design"],
      ["Information Management", "Human-Computer Interaction", "Networking 2", "Application Development"],
    ],
    [
      ["Information Assurance and Security 1", "Integrative Programming", "Web Development 2", "Software Engineering"],
      ["Information Assurance and Security 2", "Mobile Application Development", "Systems Integration and Architecture", "Quantitative Methods"],
    ],
    [
      ["Systems Administration and Maintenance", "Capstone Project 1", "IT Elective 1", "IT Project Management"],
      ["Capstone Project 2", "Practicum / Internship", "IT Elective 2", "Professional Issues in IT"],
    ],
  ],

  BSSW: [
    [
      ["Introduction to Social Work", "Human Behavior and Social Environment 1", "General Psychology", "Introduction to Sociology"],
      ["Social Welfare Policies and Programs", "Human Behavior and Social Environment 2", "Philippine Social Realities", "Social Work Communication"],
    ],
    [
      ["Social Work Methods 1: Social Casework", "Social Work Research 1", "Social Welfare Administration", "Community Organization"],
      ["Social Work Methods 2: Group Work", "Social Work Research 2", "Social Legislation", "Working with Individuals and Families"],
    ],
    [
      ["Social Work Methods 3: Community Organization", "Social Work with Communities", "Social Work Practice with Children", "Program Planning and Development"],
      ["Social Work Practice with Groups", "Social Work in Health Settings", "Disaster and Crisis Intervention", "Monitoring and Evaluation"],
    ],
    [
      ["Field Instruction 1", "Social Work Practice with Organizations", "Social Work Ethics and Values", "Social Work Elective"],
      ["Field Instruction 2", "Social Work Seminar", "Case Documentation and Assessment", "Social Work Internship"],
    ],
  ],

  BSHM: [
    [
      ["Introduction to Hospitality Industry", "Fundamentals of Food Service", "Kitchen Essentials and Basic Food Preparation", "Hospitality Mathematics"],
      ["Front Office Operations", "Food and Beverage Service", "Sanitation and Safety", "Hospitality Communication"],
    ],
    [
      ["Housekeeping Operations", "Culinary Fundamentals", "Hospitality Marketing", "Food and Beverage Cost Control"],
      ["Events Management", "Beverage Operations", "Hospitality Accounting", "Tourism and Travel Fundamentals"],
    ],
    [
      ["Rooms Division Management", "Menu Planning and Design", "Hospitality Human Resources", "Research in Hospitality"],
      ["Resort and Club Management", "Hospitality Facilities Management", "Revenue Management", "Entrepreneurship in Hospitality"],
    ],
    [
      ["Hospitality Strategic Management", "Hospitality Research Project 1", "Advanced Culinary Applications", "Hospitality Elective"],
      ["Hospitality Research Project 2", "Hospitality Internship", "Quality Service Management", "Hospitality Seminar"],
    ],
  ],

  "BSED-PRI": [
    [
      ["The Child and Adolescent Learner", "Foundations of Education", "Facilitating Learner-Centered Teaching", "Teaching Profession Overview"],
      ["Curriculum Development", "Assessment of Learning 1", "Technology for Teaching and Learning 1", "Principles of Teaching"],
    ],
    [
      ["Teaching Mathematics in the Elementary Grades 1", "Teaching Science in the Elementary Grades 1", "Teaching English in the Elementary Grades 1", "Teaching Social Studies in the Elementary Grades"],
      ["Teaching Mathematics in the Elementary Grades 2", "Teaching Science in the Elementary Grades 2", "Teaching English in the Elementary Grades 2", "Teaching Filipino in the Elementary Grades"],
    ],
    [
      ["Assessment of Learning 2", "Teaching Arts and Music in Elementary Grades", "Teaching MAPEH in Elementary Grades", "Inclusive Education"],
      ["Teaching Reading and Literacy", "Teaching Filipino in the Elementary Grades 2", "Educational Technology 2", "Research in Education 1"],
    ],
    [
      ["Field Study 1", "Field Study 2", "Research in Education 2", "Classroom Management"],
      ["Teaching Internship", "Practice Teaching Seminar", "Portfolio Development", "Professional Education Review"],
    ],
  ],

  "BSED-SEC": [
    [
      ["The Child and Adolescent Learner", "Foundations of Education", "Facilitating Learner-Centered Teaching", "Teaching Profession Overview"],
      ["Curriculum Development", "Assessment of Learning 1", "Technology for Teaching and Learning 1", "Principles of Teaching"],
    ],
    [
      ["Principles and Theories of Learning", "Assessment in Learning 2", "Educational Research 1", "Teaching Strategies and Methods"],
      ["Inclusive Education", "Technology for Teaching and Learning 2", "Classroom Assessment", "Educational Research 2"],
    ],
    [
      ["Teaching Strategies in the Major Field 1", "Curriculum and Instruction", "Classroom Management", "Teaching Internship Preparation"],
      ["Teaching Strategies in the Major Field 2", "Assessment of Learning 3", "Guidance and Counseling in Education", "Instructional Materials Development"],
    ],
    [
      ["Field Study 1", "Field Study 2", "Research in Education 3", "Professional Education Elective"],
      ["Teaching Internship", "Practice Teaching Seminar", "Portfolio Development", "Professional Education Review"],
    ],
  ],
};

const generalSubjects = {
  "1-1": [
    "Understanding the Self",
    "Mathematics in the Modern World",
    "Purposive Communication",
    "National Service Training Program 1",
  ],
  "1-2": [
    "Readings in Philippine History",
    "The Contemporary World",
    "Art Appreciation",
    "National Service Training Program 2",
  ],
  "2-1": [
    "Ethics",
    "Science, Technology and Society",
    "Physical Education 1",
    "Komunikasyon sa Akademikong Filipino",
  ],
  "2-2": [
    "Life and Works of Rizal",
    "Purposive Communication Workshop",
    "Physical Education 2",
    "Pagbasa at Pagsulat Tungo sa Pananaliksik",
  ],
  "3-1": [
    "Physical Education 3",
    "The Filipino in the Contemporary World",
    "General Education Elective 1",
    "General Education Elective 2",
  ],
  "3-2": [
    "Physical Education 4",
    "Environmental Science",
    "General Education Elective 3",
    "General Education Elective 4",
  ],
  "4-1": [
    "Capstone / Research Project 1",
    "Practicum Preparation",
    "Program Elective 1",
    "Program Elective 2",
  ],
  "4-2": [
    "Capstone / Research Project 2",
    "Internship / Field Practicum",
    "Program Elective 3",
    "Program Elective 4",
  ],
};

function subjectCode(programCode, year, semester, index) {
  const prefix = programCode.replace(/[^A-Z]/g, "").slice(0, 3);
  return `${prefix}-${year}${semester}-${String(index).padStart(2, "0")}`;
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "Csfj_lms",
  });

  let inserted = 0;
  let skipped = 0;

  try {
    await db.beginTransaction();

    for (const [programCode, semesters] of Object.entries(programs)) {
      const [programRows] = await db.execute(
        `SELECT id
         FROM academic_programs
         WHERE program_code = ?
         LIMIT 1`,
        [programCode]
      );

      if (!programRows.length) {
        throw new Error(`Academic program not found: ${programCode}`);
      }

      const programId = programRows[0].id;

      for (let year = 1; year <= 4; year++) {
        for (let semester = 1; semester <= 2; semester++) {
          const key = `${year}-${semester}`;
          const specialized = semesters[year - 1][semester - 1];
          const general = generalSubjects[key];

          for (let i = 0; i < 4; i++) {
            const code = subjectCode(programCode, year, semester, i + 1);
            const name = specialized[i];
            const units = /internship|practicum|field instruction|field study/i.test(name)
              ? 3
              : 3;

            const [result] = await db.execute(
              `INSERT INTO curriculum_subjects
                (program_id, subject_code, subject_name, description,
                 year_level, semester, units)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE id = id`,
              [
                programId,
                code,
                name,
                "Sample curriculum subject. Verify against the school's approved curriculum.",
                year,
                semester,
                units,
              ]
            );

            if (result.affectedRows === 1) inserted++;
            else skipped++;
          }

          // Add four general education subjects using separate unique codes.
          for (let i = 0; i < 4; i++) {
            const code = `GE-${year}${semester}-${String(i + 1).padStart(2, "0")}`;

            const [result] = await db.execute(
              `INSERT INTO curriculum_subjects
                (program_id, subject_code, subject_name, description,
                 year_level, semester, units)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE id = id`,
              [
                programId,
                code,
                general[i],
                "Sample general education subject. Verify against the school's approved curriculum.",
                year,
                semester,
                3,
              ]
            );

            if (result.affectedRows === 1) inserted++;
            else skipped++;
          }
        }
      }
    }

    await db.commit();
    console.log("Sample curriculum seeding completed.");
    console.log(`New subject records: ${inserted}`);
    console.log(`Existing records skipped: ${skipped}`);
    console.log("Programs: 6 | Year levels: 4 | Semesters per year: 2");
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Curriculum seeding failed:", error.message);
  process.exitCode = 1;
});
