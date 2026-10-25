export const initialStats = [
  { title: 'Total Students', value: '248', change: '12%', icon: '♟', color: 'blue' },
  { title: 'Total Instructors', value: '18', change: '6%', icon: '♟', color: 'green' },
  { title: 'Active Courses', value: '24', change: '8%', icon: '▣', color: 'purple' },
  { title: 'Total Enrollments', value: '520', change: '15%', icon: '♧', color: 'gold' },
  { title: 'Total Assignments', value: '142', change: '10%', icon: '▤', color: 'red' },
  { title: 'Total Quizzes', value: '68', change: '9%', icon: '▧', color: 'teal' },
];

export const initialActivities = [
  { icon: '♟', title: 'New student enrollment', description: 'Juan Dela Cruz enrolled in BSIT-301', time: '2 hours ago', color: 'blue' },
  { icon: '▤', title: 'Assignment submitted', description: 'Maria Santos submitted BSIT-301 Lab Report', time: '4 hours ago', color: 'purple' },
  { icon: '▣', title: 'New course created', description: 'Web Development Fundamentals', time: '6 hours ago', color: 'gold' },
  { icon: '✓', title: 'Quiz completed', description: 'Jose Reyes completed JavaScript Quiz', time: '8 hours ago', color: 'green' },
  { icon: '+', title: 'New user registered', description: 'Ana Lopez registered as Instructor', time: '10 hours ago', color: 'purple' },
];

export const instructorStats = [
  { title: 'Assigned Courses', value: '4', change: '2', icon: '▣', color: 'blue' },
  { title: 'Total Students', value: '86', change: '8%', icon: '♟', color: 'green' },
  { title: 'Active Assignments', value: '12', change: '3', icon: '▤', color: 'purple' },
  { title: 'Pending Submissions', value: '18', change: '5', icon: '▧', color: 'gold' },
];

export const studentStats = [
  { title: 'Enrolled Courses', value: '5', change: '1', icon: '▣', color: 'blue' },
  { title: 'Pending Assignments', value: '3', change: '2', icon: '▤', color: 'gold' },
  { title: 'Completed Assignments', value: '12', change: '4', icon: '✓', color: 'green' },
  { title: 'Average Grade', value: '91%', change: '3%', icon: '▥', color: 'purple' },
];

export const sampleCourses = [
  { code: 'BSIT-301', name: 'Integrative Programming and Technologies', instructor: 'Instructor One', progress: 75 },
  { code: 'BSIT-302', name: 'Web Development', instructor: 'Instructor Two', progress: 60 },
  { code: 'BSIT-303', name: 'Information Assurance and Security', instructor: 'Instructor Three', progress: 45 },
];

export const sampleAssignments = [
  { title: 'Laboratory Activity 1', course: 'Integrative Programming', deadline: 'October 12, 2026', status: 'Pending' },
  { title: 'Website Development Project', course: 'Web Development', deadline: 'October 15, 2026', status: 'Pending' },
  { title: 'Network Security Report', course: 'Information Assurance and Security', deadline: 'October 18, 2026', status: 'Submitted' },
];

export const instructorActivities = [
  { icon: '▤', title: 'Assignment submitted', description: 'Pedro Cruz submitted Lab Activity 3', time: '1hour ago', color: 'blue' },
  { icon: '✓', title: 'Quiz completed', description: 'Maria Santos completed Python Quiz', time: '3 hours ago', color: 'green' },
  { icon: '♟', title: 'New student enrolled', description: 'Juan Dela Cruz enrolled in BSIT-302', time: '5hours ago', color: 'purple' },
  { icon: '▤', title: 'Assignment submitted', description: 'Ana Lopez submitted Web Project', time: '7 hours ago', color: 'gold' },
];

export const studentActivities = [
  { icon: '▣', title: 'New module posted', description: 'Web Development — Module 5: React Basics', time: '1 hour ago', color: 'blue' },
  { icon: '▤', title: 'Assignment deadline approaching', description: 'Laboratory Activity 1 due in 2 days', time: '3 hours ago', color: 'gold' },
  { icon: '✓', title: 'Grade posted', description: 'Integrative Programming — Midterm Exam: 92%', time: '1day ago', color: 'green' },
  { icon: '▧', title: 'New quiz available', description: 'Information Assurance — Quiz 3 is now open', time: '2 days ago', color: 'purple' },
];

export const roleTitle = {
  admin: 'Administrator',
  instructor: 'Instructor',
  student: 'Student',
};
