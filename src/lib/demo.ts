import type { Assignment, ClassroomMessage, Course } from './types';

export const demoCourses: Course[] = [
  {
    id: 'course-design-ai',
    title: 'Graphic Design with AI',
    description: 'A practical course on building a modern AI-assisted design workflow.',
    cover_url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&q=85',
    creator_id: 'demo-creator',
    published: true,
    progress: 42,
    modules: [
      { id: 'module-1', title: 'Getting started', position: 1, lessons: [
        { id: 'lesson-1', title: 'Welcome to the course', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 1, duration_seconds: 420, completed: true },
        { id: 'lesson-2', title: 'How AI changes the design process', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 2, duration_seconds: 680, completed: true },
        { id: 'lesson-3', title: 'Setting up your creative workflow', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 3, duration_seconds: 540, completed: false },
      ] },
      { id: 'module-2', title: 'Creative direction', position: 2, lessons: [
        { id: 'lesson-4', title: 'Thinking before prompting', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 1, duration_seconds: 840, completed: false },
        { id: 'lesson-5', title: 'Developing visual concepts', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 2, duration_seconds: 620, completed: false },
      ] },
      { id: 'module-3', title: 'Image generation', position: 3, lessons: [
        { id: 'lesson-6', title: 'Building your first image', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 1, duration_seconds: 960, completed: false },
      ] },
    ],
  },
  {
    id: 'course-brand-systems',
    title: 'Building Brand Systems',
    description: 'Move from a logo to a complete and consistent brand system.',
    cover_url: 'https://images.unsplash.com/photo-1634942536790-253a6f7e2d4f?w=1200&q=85',
    creator_id: 'demo-creator',
    published: true,
    progress: 16,
    modules: [
      { id: 'module-4', title: 'Foundations', position: 1, lessons: [
        { id: 'lesson-7', title: 'What makes a brand system?', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 1, duration_seconds: 720, completed: true },
        { id: 'lesson-8', title: 'Strategy and positioning', youtube_url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', position: 2, duration_seconds: 920, completed: false },
      ] },
    ],
  },
];

export const demoAssignments: Assignment[] = [
  { id: 'assignment-1', course_id: 'course-design-ai', title: 'Create a visual direction', instructions: 'Choose a brand and develop one clear visual direction. Include a reference board and a short explanation of your decisions.', week_number: 3, due_at: new Date(Date.now() + 3 * 86400000).toISOString(), published: true, submission: null },
  { id: 'assignment-2', course_id: 'course-design-ai', title: 'Build an AI-assisted campaign visual', instructions: 'Develop one campaign visual using the workflow from this week. Submit a link to your final work and explain the process.', week_number: 2, due_at: new Date(Date.now() - 86400000).toISOString(), published: true, submission: { id: 'submission-2', response: 'I explored three visual routes and selected the strongest direction.', status: 'submitted', feedback: '' } },
  { id: 'assignment-3', course_id: 'course-brand-systems', title: 'Audit a brand identity', instructions: 'Select an existing brand and document the strengths and gaps in its visual system.', week_number: 1, due_at: new Date(Date.now() + 7 * 86400000).toISOString(), published: true, submission: null },
];

export const demoMessages: ClassroomMessage[] = [
  { id: 'message-1', course_id: 'course-design-ai', author_id: 'demo-student-1', body: 'I tried the workflow from the last lesson on a bakery brand. The first concept came together much faster than I expected.', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), author: { full_name: 'Amara Eze' } },
  { id: 'message-2', course_id: 'course-design-ai', author_id: 'demo-student-2', body: 'The part about choosing a direction before prompting made the biggest difference for me.', created_at: new Date(Date.now() - 75 * 60000).toISOString(), author: { full_name: 'Daniel Okafor' } },
  { id: 'message-3', course_id: 'course-design-ai', author_id: 'demo-creator', body: 'Share your experiments here. The decisions behind the work matter just as much as the final image.', created_at: new Date(Date.now() - 25 * 60000).toISOString(), author: { full_name: 'Chisom Ogbonna' } },
];
