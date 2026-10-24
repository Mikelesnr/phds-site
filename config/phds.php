<?php

/*
|--------------------------------------------------------------------------
| PHDS site content
|--------------------------------------------------------------------------
|
| First iteration: all public copy lives here so it can be edited in one
| place. Every figure and statement comes from the organisation's concept
| deck. When a CMS or admin panel is added, these arrays map directly onto
| database tables (focus_areas, board_members, counties).
|
*/

return [

    'name' => 'Planetary Health and Development Stewards',
    'short_name' => 'PHDS',
    'tagline' => 'A thriving planet for humans and all life forms.',
    'registration' => 'A Public Benefit Organization registered in Kenya',

    // Optional. Leave empty until the organisation confirms public contact details.
    'contact_email' => env('PHDS_CONTACT_EMAIL'),
    'contact_location' => env('PHDS_CONTACT_LOCATION', 'Lake Victoria Basin, Kenya'),

    /*
    |--------------------------------------------------------------------------
    | Seeded accounts
    |--------------------------------------------------------------------------
    |
    | Read by Database\Seeders\UserSeeder. Credentials come from .env so no
    | password lives in the repository. Always read them through config(), not
    | env(), so they keep working after `php artisan config:cache`.
    |
    */

    'seed' => [
        'admin' => [
            'name' => env('SEED_ADMIN_NAME', 'PHDS Admin'),
            'email' => env('SEED_ADMIN_EMAIL'),
            'password' => env('SEED_ADMIN_PASSWORD'),
        ],

        // The two staff accounts share one password.
        'staff_password' => env('SEED_STAFF_PASSWORD'),

        'staff' => [
            [
                'name' => env('SEED_STAFF_1_NAME', 'Achieng Odero'),
                'email' => env('SEED_STAFF_1_EMAIL', 'achieng.odero@example.org'),
            ],
            [
                'name' => env('SEED_STAFF_2_NAME', 'Kevin Mwangi'),
                'email' => env('SEED_STAFF_2_EMAIL', 'kevin.mwangi@example.org'),
            ],
        ],
    ],

    'vision' => 'A thriving planet for humans and all life forms.',
    'mission' => 'To provide regenerative solutions for the health of the planet, communities and ecosystems through interdisciplinary action.',

    'quote' => 'Planetary Health and Development Stewards works closely with communities to address the pressing issues of global health, poverty, biodiversity loss and climate change through interdisciplinary, multisectoral and evidence-based approaches.',

    'story' => [
        'Our story is born from the lived experiences of our founding board of directors, who hail from Lambwe Valley in the Lake Victoria basin of Kenya. This region, like many places on Earth, faces a poly crisis that poses an existential threat to all forms of life.',
        'We are acutely aware that human activity has the most profound negative impact on the planet. From climate change to environmental degradation, the effects are felt across ecosystems and human populations, leading to biodiversity loss, disease, hunger and poverty.',
        'We identified unsustainable use of natural resources, policy gaps, the exclusion of local communities from decision making and inadequate financial resourcing as key drivers of poverty, disease, socio-political instability and environmental degradation.',
        'These challenges are not limited to our community. They affect millions of others around the world. Through reflection and inquiry, we are putting planetary health stewardship into practice as a conscious and unifying approach to promote human development and ecosystem regeneration.',
    ],

    'values' => [
        ['title' => 'Stewardship', 'body' => 'Responsible use of resources and the natural systems that sustain us.', 'icon' => 'leaf'],
        ['title' => 'Community', 'body' => 'Partnership and collaboration across sectors.', 'icon' => 'users'],
        ['title' => 'Innovation', 'body' => 'Transforming ideas into impactful and scalable solutions.', 'icon' => 'lightbulb'],
        ['title' => 'Regeneration', 'body' => 'Thriving ecosystems for humans and all life forms.', 'icon' => 'sprout'],
        ['title' => 'Knowledge', 'body' => 'Driven by indigenous knowledge and scientific evidence.', 'icon' => 'book'],
    ],

    'objectives' => [
        'Promote interdisciplinary action to mitigate the impact of human disruptions to the Earth\'s natural systems and all life on Earth.',
        'Promote interdisciplinary collaboration to safeguard the livelihoods of communities impacted by climate change.',
        'Promote evidence-based policy and advocacy for planetary health.',
        'Promote innovation and the adaptation of technology at the intersection of planetary health and human development.',
        'Build the capacity of frontline workers in related sectors to advocate for planetary health.',
    ],

    'pillars' => [
        ['title' => 'Community participation', 'body' => 'Local people take part in the decisions that shape their lake, land and livelihoods.', 'icon' => 'users'],
        ['title' => 'Interdisciplinary action', 'body' => 'Health, environment, economy and policy are tackled together, not in isolation.', 'icon' => 'network'],
        ['title' => 'Regenerative systems', 'body' => 'We restore the natural systems that communities depend on, rather than only slowing their decline.', 'icon' => 'sprout'],
        ['title' => 'Technology and innovation', 'body' => 'Appropriate technology is adapted where planetary health meets human development.', 'icon' => 'lightbulb'],
    ],

    'stats' => [
        ['value' => '5', 'label' => 'Focus counties', 'note' => 'Counties that share direct shoreline with Lake Victoria'],
        ['value' => '5.29M', 'label' => 'People in our focus counties', 'note' => 'A population of 5,290,824'],
        ['value' => '22%', 'label' => 'Of the basin catchment', 'note' => 'Kenya\'s terrestrial share of the Lake Victoria Basin'],
        ['value' => '6%', 'label' => 'Of the lake surface', 'note' => 'Kenya\'s surface share of Lake Victoria'],
    ],

    'basin' => [
        'countries' => 'Kenya, Tanzania, Uganda, Rwanda and Burundi',
        'summary' => 'The Lake Victoria Basin catchment spans five countries in East Africa. In Kenya it covers 14 counties, and PHDS focuses on the five that share direct shoreline with the lake.',
    ],

    'counties' => [
        ['name' => 'Homa Bay', 'share' => 40],
        ['name' => 'Siaya', 'share' => 25],
        ['name' => 'Kisumu', 'share' => 15],
        ['name' => 'Migori', 'share' => 12],
        ['name' => 'Busia', 'share' => 8],
    ],

    'board' => [
        ['name' => 'Ronnie Asino', 'position' => 'Chairperson', 'profession' => 'Healthcare', 'contribution' => 'Clinical practice, public health, and leadership and management in health.'],
        ['name' => 'Stacey Achieng', 'position' => 'Secretary', 'profession' => 'Legal practice (Advocate)', 'contribution' => 'Legal advice and statutory compliance.'],
        ['name' => 'Lydia Ouma', 'position' => 'Treasurer', 'profession' => 'Finance and procurement', 'contribution' => 'Finance and procurement.'],
        ['name' => 'James Onditi', 'position' => 'Member', 'profession' => 'Business and economics', 'contribution' => 'Economics and business development.'],
        ['name' => 'Stephen Agong', 'position' => 'Member', 'profession' => 'Agriculture', 'contribution' => 'Agriculture and livelihoods.'],
    ],

    'organisational_development' => [
        'Business process development',
        'Finance and administration policies',
        'Human resources policies',
        'Stakeholder mapping and partnerships',
        'Project development',
        'Concept papers and proposals',
        'Resource mobilisation',
    ],

    'partnership_routes' => [
        ['title' => 'Fund the work', 'body' => 'Support community-led programmes across the five lakeshore counties.', 'icon' => 'handshake', 'interest' => 'Funding or resource mobilisation'],
        ['title' => 'Research together', 'body' => 'Collaborate on evidence for policy, from land use to community health.', 'icon' => 'microscope', 'interest' => 'Research collaboration'],
        ['title' => 'Share your expertise', 'body' => 'Bring skills in health, law, agriculture, finance, technology or conservation.', 'icon' => 'briefcase', 'interest' => 'Skills and expertise'],
        ['title' => 'Co-develop projects', 'body' => 'Work with us on concept papers, proposals and joint programmes.', 'icon' => 'lightbulb', 'interest' => 'Project partnership'],
    ],

    'interests' => [
        'Funding or resource mobilisation',
        'Research collaboration',
        'Skills and expertise',
        'Project partnership',
        'Media or general enquiry',
    ],

    'field_story' => [
        'label' => 'From the field, Sori',
        'body' => 'During a community outreach targeting fishmongers, a community health promoter gave health education on cervical cancer screening, a relatively quick procedure. One woman agreed to go for screening only if the promoter could mind her stock while she was away.',
        'lesson' => 'Health and livelihoods cannot be separated. Programmes that ignore this do not reach the people who need them most.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Focus areas
    |--------------------------------------------------------------------------
    */

    'focus_areas' => [

        'blue-economy' => [
            'title' => 'The Blue Economy',
            'icon' => 'fish',
            'image' => '/images/weighing-catch.jpg',
            'gallery' => ['/images/cage-farming.jpg', '/images/fish-drying.jpg'],
            'hook' => 'No catch today!',
            'summary' => 'Falling catches are putting fishing communities under pressure. We look at what is driving the decline and who is left out of the decisions.',
            'intro' => 'Across the lake, fishers return with less each season. Is it over-fishing? Is it the loss of fish populations to environmental hazards? Both are part of the story, and both are rooted in how the lake is used and governed.',
            'groups' => [
                ['heading' => 'Pressure on fish stocks', 'items' => [
                    'Biodiversity loss',
                    'Use of illegal fishing gear',
                    'Human encroachment on fish breeding areas',
                    'Knowledge gaps on destructive fishing practices',
                    'Challenges with surveillance and reporting',
                ]],
                ['heading' => 'A changing lake economy', 'items' => [
                    'A growing number of cage fish farms',
                    'Policy gaps, with minimal representation of local communities',
                    'Conflicts between cage owners and other fishers over fishing space',
                ]],
            ],
        ],

        'climate-change' => [
            'title' => 'Climate Change',
            'icon' => 'cloud-rain',
            'image' => '/images/flooded-shore.jpg',
            'gallery' => ['/images/abandoned-vessel.jpg', '/images/impounded-boat.jpg', '/images/beach-landing.jpg'],
            'hook' => 'Where environment, health and livelihoods meet.',
            'summary' => 'Rising lake levels, displaced families and conflict over shrinking catches show how climate change is lived on the shore.',
            'intro' => 'Sori Beach Management Unit (BMU) is the largest BMU in Migori County. Pollution from fisheries and related economic activity sits alongside rising water. Here the environment, animal health, community health and the local economy are tightly connected.',
            'groups' => [
                ['heading' => 'Rising waters', 'items' => [
                    'Destruction of physical infrastructure by rising lake levels',
                    'Displacement of human populations',
                    'Abandoned fishing vessels',
                    'Fisherfolk migrating to new locations or to other economic activities',
                ]],
                ['heading' => 'Climate related conflict', 'items' => [
                    'Disputes arising from dwindling or unpredictable catches',
                    'Boats impounded for crossing into another BMU\'s fishing area',
                    'Unclear boundaries: how would a fisher know where one BMU ends and the next begins?',
                    'Mental health effects of these conflicts on fishing communities',
                ]],
            ],
            'case' => 'A boat registered under Muhuru BMU was impounded by Aneko BMU officials for intruding on their fishing area.',
        ],

        'green-economy' => [
            'title' => 'The Green Economy',
            'icon' => 'sprout',
            'image' => '/images/tomato-farm.jpg',
            'gallery' => [],
            'hook' => 'Feeding people without wearing out the land.',
            'summary' => 'Food production, agrochemicals, wetlands and forest cover are all under strain. We look for farming that restores rather than depletes.',
            'intro' => 'Food production is falling and malnutrition is rising. Farming practices that harm soil, water and people are common, and the land that supports communities is being worn away.',
            'groups' => [
                ['heading' => 'Land and food', 'items' => [
                    'Decreasing food production and rising malnutrition',
                    'Harmful agricultural practices',
                    'Land degradation and encroachment on wetlands',
                ]],
                ['heading' => 'Chemicals and forests', 'items' => [
                    'Unregulated agrochemicals causing harm to humans, plants and animals',
                    'Depletion of indigenous forest cover',
                ]],
            ],
        ],

        'global-health' => [
            'title' => 'Global Health',
            'icon' => 'heart-pulse',
            'image' => '/images/health-outreach.jpg',
            'gallery' => [],
            'hook' => 'Health follows the livelihood.',
            'summary' => 'Local economic activity shapes how disease spreads. We design health work around the way people actually earn a living.',
            'intro' => 'The way people earn a living on the lakeshore shapes who gets sick and who gets care. Health programmes work best when they meet people where they work.',
            'groups' => [
                ['heading' => 'Why livelihoods matter for health', 'items' => [
                    'The interplay between local economic activities and the spread of infectious diseases',
                    'The migratory nature of fisherfolk',
                    'Power imbalance between men and women',
                    'The effects of HIV, TB and other communicable diseases',
                ]],
            ],
            'story' => true,
        ],

        'one-health' => [
            'title' => 'One Health',
            'icon' => 'paw-print',
            'image' => '/images/market-storks.jpg',
            'gallery' => ['/images/shared-shoreline.jpg', '/images/lakeside-cattle.jpg'],
            'hook' => 'People, animals and the places they share.',
            'summary' => 'Humans and animals share habitats and food systems. That creates risk, and it creates opportunity for early surveillance and prevention.',
            'intro' => 'On the lakeshore, people, livestock and wildlife share water, land and food systems. That closeness raises the risk of disease crossing between species, and it opens the door to prevention.',
            'groups' => [
                ['heading' => 'Shared risks', 'items' => [
                    'Shared habitat and food systems between humans and animals',
                    'Zoonotic disease',
                    'Human and wildlife conflict',
                ]],
                ['heading' => 'Shared opportunities', 'items' => [
                    'Disease surveillance activities',
                    'Disease prevention',
                ]],
            ],
        ],

        'research-and-policy' => [
            'title' => 'Research and Policy',
            'icon' => 'book',
            'image' => '/images/fishermen-cooperative.jpg',
            'gallery' => [],
            'hook' => 'Evidence that reaches decision makers.',
            'summary' => 'Good policy needs good evidence. We identify research questions that matter to lakeshore communities and carry them into advocacy.',
            'intro' => 'Evidence-based policy and advocacy is one of our core objectives. These are the research areas we see as most promising.',
            'groups' => [
                ['heading' => 'Possible research areas', 'items' => [
                    'Access to digital technologies',
                    'Land use and agricultural productivity',
                    'Cross border migration',
                    'Population health',
                    'Market information systems',
                    'Community health',
                    'Environmental health',
                ]],
            ],
        ],
    ],
];
