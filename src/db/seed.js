const { randomUUID } = require('crypto');
const { getClient } = require('./queries');
const pool = require('../config/database');

const TABLES = [
  'messages',
  'message_threads',
  'reviews',
  'payments',
  'escrows',
  'milestones',
  'contracts',
  'proposals',
  'project_skills',
  'projects',
  'freelancer_skills',
  'skills',
  'client_profiles',
  'freelancer_profiles',
  'users'
];

const insertMany = async (connection, sql, rows) => {
  for (const row of rows) {
    await connection.query(sql, row);
  }
};

const seed = async () => {
  const connection = await getClient();

  try {
    console.log('Resetting existing data...');
    // PostgreSQL: Disable foreign key checks temporarily
    await connection.query('SET session_replication_role = replica');
    for (const table of TABLES) {
      await connection.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }
    await connection.query('SET session_replication_role = DEFAULT');

    await connection.query('BEGIN');

    const userIds = {
      janeClient: randomUUID(),
      hiroClient: randomUUID(),
      johnFreelancer: randomUUID(),
      priyaFreelancer: randomUUID(),
      carlosFreelancer: randomUUID(),
      avaAdmin: randomUUID()
    };

    const clientProfileIds = {
      jane: randomUUID(),
      hiro: randomUUID()
    };

    const freelancerProfileIds = {
      john: randomUUID(),
      priya: randomUUID(),
      carlos: randomUUID()
    };

    const skillIds = {
      javascript: randomUUID(),
      react: randomUUID(),
      node: randomUUID(),
      mysql: randomUUID(),
      uiux: randomUUID(),
      python: randomUUID()
    };

    const projectIds = {
      reactDashboard: randomUUID(),
      ecommerceApi: randomUUID(),
      mobileAppDevelopment: randomUUID()
    };

    const contractIds = {
      reactDashboard: randomUUID(),
      ecommerceApi: randomUUID(),
      mobileAppDevelopment: randomUUID()
    };

    const milestoneIds = {
      discovery: randomUUID(),
      delivery: randomUUID(),
      apiMvp: randomUUID()
    };

    const threadIds = {
      projectReact: randomUUID(),
      contractReact: randomUUID()
    };

    // Password for all users: 'Password123!' (except admin: 'Admin123!')
    const users = [
      [
        userIds.janeClient,
        'jane.client@example.com',
        '$2b$10$DhWaEguqj7WZwZda6Dlz9ufOMA4POtIj31VoyfAAJTHniwh0mCZ.u', // Password123!
        'client',
        'Jane',
        'Smith',
        '+44 1234 567890',
        'United Kingdom',
        true
      ],
      [
        userIds.hiroClient,
        'hiro.client@example.com',
        '$2b$10$Bu0vUJ.rjT5F5356xmjaQOkf8kFrwYjFugfGD0RBd7D1DOIwPfGd6', // Password123!
        'client',
        'Hiro',
        'Tanaka',
        '+81 80-1234-5678',
        'Japan',
        true
      ],
      [
        userIds.johnFreelancer,
        'john.freelancer@example.com',
        '$2b$10$mXwDteNzRqmtUYSedu77J..MZXFUdhD4vmTlvoBtMutW000HTczVu', // Password123!
        'freelancer',
        'John',
        'Doe',
        '+1 212-555-0101',
        'United States',
        true
      ],
      [
        userIds.priyaFreelancer,
        'priya.freelancer@example.com',
        '$2b$10$unUJ8v6N3JDvoIIkG/lOKOJPUsi7BPddmZko.p.nquJXPQ.UcKyWi', // Password123!
        'freelancer',
        'Priya',
        'Patel',
        '+91 98765 43210',
        'India',
        true
      ],
      [
        userIds.carlosFreelancer,
        'carlos.freelancer@example.com',
        '$2b$10$H.qQ5ldm9.H3Yz9QYW5/DetQgpmVdQqXkN9qK/qfSwv90Dif7QgYe', // Password123!
        'freelancer',
        'Carlos',
        'Mendez',
        '+52 55 1234 5678',
        'Mexico',
        false
      ],
      [
        userIds.avaAdmin,
        'ava.admin@example.com',
        '$2b$10$74ylMMggLDXyaPtE4Atf9O39KtZGWam.Yfp0T2gghCGlF5fiXgfve', // Admin123!
        'admin',
        'Ava',
        'Wong',
        '+61 2 9876 5432',
        'Australia',
        true
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, country, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      users
    );

    const freelancerProfiles = [
      [
        freelancerProfileIds.john,
        userIds.johnFreelancer,
        'Full-stack developer specialising in React and Node.js applications.',
        65.0,
        6,
        'Senior Full-stack Developer',
        4.9,
        32,
        JSON.stringify({
          timezone: 'America/New_York',
          availability: {
            monday: ['09:00-17:00'],
            tuesday: ['09:00-17:00'],
            thursday: ['10:00-15:00']
          },
          weeklyCapacityHours: 30
        })
      ],
      [
        freelancerProfileIds.priya,
        userIds.priyaFreelancer,
        'Backend engineer focused on data-intensive APIs and cloud-native systems.',
        55.0,
        5,
        'Backend & Data Engineer',
        4.8,
        21,
        JSON.stringify({
          timezone: 'Asia/Kolkata',
          availability: {
            monday: ['13:00-18:00'],
            wednesday: ['09:00-17:00'],
            friday: ['09:00-15:00']
          },
          weeklyCapacityHours: 25
        })
      ],
      [
        freelancerProfileIds.carlos,
        userIds.carlosFreelancer,
        'UI/UX designer crafting delightful product experiences and design systems.',
        45.0,
        4,
        'Product Designer & UX Specialist',
        4.6,
        14,
        JSON.stringify({
          timezone: 'America/Mexico_City',
          availability: {
            tuesday: ['10:00-16:00'],
            thursday: ['10:00-16:00']
          },
          weeklyCapacityHours: 20
        })
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO freelancer_profiles (id, user_id, bio, hourly_rate, experience_years, headline, rating_avg, rating_count, availability)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      freelancerProfiles
    );

    const clientProfiles = [
      [
        clientProfileIds.jane,
        userIds.janeClient,
        'Bright Pixel Labs',
        '11-50',
        'https://brightpixel.io',
        4.7,
        12,
        true
      ],
      [
        clientProfileIds.hiro,
        userIds.hiroClient,
        'Sakura Commerce',
        '51-200',
        'https://sakuracommerce.jp',
        4.5,
        8,
        false
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO client_profiles (id, user_id, company_name, company_size, website, rating_avg, rating_count, is_business_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      clientProfiles
    );

    const skills = [
      [skillIds.javascript, 'JavaScript', 'Programming'],
      [skillIds.react, 'React', 'Frontend'],
      [skillIds.node, 'Node.js', 'Backend'],
      [skillIds.mysql, 'MySQL', 'Database'],
      [skillIds.uiux, 'UI/UX Design', 'Design'],
      [skillIds.python, 'Python', 'Programming']
    ];

    await insertMany(
      connection,
      `INSERT INTO skills (id, name, category)
       VALUES (?, ?, ?)`,
      skills
    );

    const freelancerSkills = [
      [randomUUID(), freelancerProfileIds.john, skillIds.javascript, 5, 6],
      [randomUUID(), freelancerProfileIds.john, skillIds.react, 5, 5],
      [randomUUID(), freelancerProfileIds.john, skillIds.node, 4, 5],
      [randomUUID(), freelancerProfileIds.priya, skillIds.node, 5, 5],
      [randomUUID(), freelancerProfileIds.priya, skillIds.python, 5, 6],
      [randomUUID(), freelancerProfileIds.priya, skillIds.mysql, 4, 5],
      [randomUUID(), freelancerProfileIds.carlos, skillIds.uiux, 5, 4],
      [randomUUID(), freelancerProfileIds.carlos, skillIds.react, 3, 2]
    ];

    await insertMany(
      connection,
      `INSERT INTO freelancer_skills (id, freelancer_id, skill_id, proficiency, years)
       VALUES (?, ?, ?, ?, ?)`,
      freelancerSkills
    );

    const projects = [
      [
        projectIds.reactDashboard,
        clientProfileIds.jane,
        'React Dashboard Revamp',
        'Update an existing SaaS analytics dashboard with new visualizations and responsive design improvements.',
        'fixed',
        3500.0,
        5500.0,
        'USD',
        'open',
        'public',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 25)
      ],
      [
        projectIds.ecommerceApi,
        clientProfileIds.hiro,
        'E-commerce API Modernisation',
        'Build a modular API for our e-commerce backend with integrations to payment and inventory systems.',
        'hourly',
        40.0,
        65.0,
        'USD',
        'in_progress',
        'invite_only',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 40)
      ],
      [
        projectIds.mobileAppDevelopment,
        clientProfileIds.jane,
        'React Native Mobile App Development',
        'Develop a cross-platform mobile app for iOS and Android with real-time notifications and offline support.',
        'hourly',
        35.0,
        55.0,
        'USD',
        'open',
        'public',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO projects (id, client_id, title, description, project_type, budget_min, budget_max, currency, status, visibility, posted_at, due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      projects
    );

    const projectSkills = [
      [randomUUID(), projectIds.reactDashboard, skillIds.javascript],
      [randomUUID(), projectIds.reactDashboard, skillIds.react],
      [randomUUID(), projectIds.reactDashboard, skillIds.uiux],
      [randomUUID(), projectIds.ecommerceApi, skillIds.node],
      [randomUUID(), projectIds.ecommerceApi, skillIds.mysql],
      [randomUUID(), projectIds.ecommerceApi, skillIds.python],
      [randomUUID(), projectIds.mobileAppDevelopment, skillIds.react],
      [randomUUID(), projectIds.mobileAppDevelopment, skillIds.javascript],
      [randomUUID(), projectIds.mobileAppDevelopment, skillIds.node]
    ];

    await insertMany(
      connection,
      `INSERT INTO project_skills (id, project_id, skill_id)
       VALUES (?, ?, ?)`,
      projectSkills
    );

    const proposals = [
      [
        randomUUID(),
        projectIds.reactDashboard,
        freelancerProfileIds.john,
        4200.0,
        null,
        80,
        'I can deliver the redesign along with a component library and documentation.',
        'shortlisted',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      ],
      [
        randomUUID(),
        projectIds.reactDashboard,
        freelancerProfileIds.priya,
        4800.0,
        null,
        90,
        'Happy to collaborate with your design team and provide weekly progress demos.',
        'submitted',
        new Date(Date.now() - 1000 * 60 * 60 * 24)
      ],
      [
        randomUUID(),
        projectIds.ecommerceApi,
        freelancerProfileIds.priya,
        null,
        58.0,
        120,
        'I have experience with large scale commerce APIs and can optimise data flows.',
        'accepted',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 6)
      ],
      [
        randomUUID(),
        projectIds.ecommerceApi,
        freelancerProfileIds.carlos,
        null,
        42.0,
        60,
        'Can support your product team with UX reviews and new admin panels.',
        'rejected',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      ],
      [
        randomUUID(),
        projectIds.mobileAppDevelopment,
        freelancerProfileIds.john,
        null,
        52.0,
        200,
        'I have extensive React Native experience and can build a high-quality cross-platform app with real-time capabilities.',
        'submitted',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      ],
      [
        randomUUID(),
        projectIds.mobileAppDevelopment,
        freelancerProfileIds.carlos,
        null,
        48.0,
        180,
        'Strong portfolio with iOS and Android apps. Can deliver the UI/UX and coordinate with backend team.',
        'submitted',
        new Date(Date.now() - 1000 * 60 * 60 * 12)
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO proposals (id, project_id, freelancer_id, bid_amount, hourly_rate, estimated_hours, cover_letter, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      proposals
    );

    const contracts = [
      [
        contractIds.reactDashboard,
        projectIds.reactDashboard,
        clientProfileIds.jane,
        freelancerProfileIds.john,
        'fixed',
        'active',
        4200.0,
        null,
        'USD',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        null
      ],
      [
        contractIds.ecommerceApi,
        projectIds.ecommerceApi,
        clientProfileIds.hiro,
        freelancerProfileIds.priya,
        'hourly',
        'active',
        null,
        58.0,
        'USD',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        null
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO contracts (id, project_id, client_id, freelancer_id, contract_type, status, agreed_amount, hourly_rate, currency, start_at, end_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      contracts
    );

    const milestones = [
      [
        milestoneIds.discovery,
        contractIds.reactDashboard,
        'Discovery & Wireframes',
        'Audit existing dashboard, create wireframes, and gather stakeholder feedback.',
        1800.0,
        'released',
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        new Date(Date.now() - 1000 * 60 * 60 * 12)
      ],
      [
        milestoneIds.delivery,
        contractIds.reactDashboard,
        'Component Library Delivery',
        'Implement reusable React components, finalize responsive layout, and deliver docs.',
        2400.0,
        'in_review',
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
        null
      ],
      [
        milestoneIds.apiMvp,
        contractIds.ecommerceApi,
        'API MVP Release',
        'Deliver core product, pricing, and checkout microservices with integration tests.',
        0.0,
        'funded',
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        null
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO milestones (id, contract_id, title, scope, amount, status, due_at, released_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      milestones
    );

    const escrows = [
      [
        randomUUID(),
        milestoneIds.discovery,
        1800.0,
        'USD',
        'released',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        new Date(Date.now() - 1000 * 60 * 60 * 12)
      ],
      [
        randomUUID(),
        milestoneIds.delivery,
        2400.0,
        'USD',
        'funded',
        new Date(Date.now() - 1000 * 60 * 60 * 6),
        new Date(Date.now() - 1000 * 60 * 60 * 6)
      ],
      [
        randomUUID(),
        milestoneIds.apiMvp,
        0.0,
        'USD',
        'funded',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO escrows (id, milestone_id, amount, currency, status, funded_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      escrows
    );

    const payments = [
      [
        randomUUID(),
        milestoneIds.discovery,
        clientProfileIds.jane,
        freelancerProfileIds.john,
        1800.0,
        'USD',
        'card',
        'paid',
        new Date(Date.now() - 1000 * 60 * 60 * 6)
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO payments (id, milestone_id, payer_client_id, payee_freelancer_id, amount, currency, method, status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      payments
    );

    const reviews = [
      [
        randomUUID(),
        contractIds.reactDashboard,
        userIds.janeClient,
        userIds.johnFreelancer,
        5,
        'John quickly understood our product vision and delivered polished UI components.',
        new Date(Date.now() - 1000 * 60 * 60 * 3)
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO reviews (id, contract_id, reviewer_user_id, reviewee_user_id, rating, comment, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      reviews
    );

    const messageThreads = [
      [
        threadIds.projectReact,
        projectIds.reactDashboard,
        null,
        'project',
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      ],
      [
        threadIds.contractReact,
        null,
        contractIds.reactDashboard,
        'contract',
        new Date(Date.now() - 1000 * 60 * 60 * 12)
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO message_threads (id, project_id, contract_id, scope, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      messageThreads
    );

    const messages = [
      [
        randomUUID(),
        threadIds.projectReact,
        userIds.janeClient,
        'Thanks for the proposal, John. Could you also include chart exporting improvements?',
        'text',
        new Date(Date.now() - 1000 * 60 * 60 * 20)
      ],
      [
        randomUUID(),
        threadIds.projectReact,
        userIds.johnFreelancer,
        'Absolutely. I will include an export module supporting PDF and CSV outputs.',
        'text',
        new Date(Date.now() - 1000 * 60 * 60 * 19)
      ],
      [
        randomUUID(),
        threadIds.contractReact,
        userIds.johnFreelancer,
        'Milestone 1 deliverables are uploaded for review. Let me know if any revisions are needed.',
        'text',
        new Date(Date.now() - 1000 * 60 * 60 * 6)
      ]
    ];

    await insertMany(
      connection,
      `INSERT INTO messages (id, thread_id, sender_user_id, body, type, sent_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      messages
    );

    await connection.query('COMMIT');
    console.log('Database seeded successfully.');
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {});
    console.error('Failed to seed database:', error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
};

seed()
  .then(() => {
    if (!process.exitCode || process.exitCode === 0) {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Unexpected error during seeding:', error);
    process.exit(1);
  });

