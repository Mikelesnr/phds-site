<?php

namespace Database\Seeders;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample posts for demos, written from the organisation's concept deck.
 * Safe to run more than once. Run with: php artisan db:seed --class=BlogSeeder
 */
class BlogSeeder extends Seeder
{
    public function run(): void
    {
        $posts = [
            'falling-catches-on-lake-victoria' => [
                'title' => 'No catch today: what is behind falling catches on Lake Victoria?',
                'excerpt' => 'Fishers are coming home with less each season. Over-fishing is only part of the story.',
                'body' => "Across the lake, fishers return with less each season. Is it over-fishing? Is it the loss of fish populations to environmental hazards? Both are part of the story.\n\nIllegal fishing gear, human encroachment on fish breeding areas, and gaps in knowledge about destructive fishing practices all add pressure. Surveillance and reporting remain a challenge.\n\nA growing number of cage fish farms is also changing the lake economy, and conflicts over fishing space between cage owners and other fishers are becoming more common. Local communities have little say in the policies that shape all of this.",
                'images' => ['/images/weighing-catch.jpg', '/images/cage-farming.jpg', '/images/fish-drying.jpg'],
                'is_featured' => true,
                'days_ago' => 3,
            ],
            'when-the-lake-rises' => [
                'title' => 'When the lake rises: climate change on the shore at Sori',
                'excerpt' => 'Rising water is destroying infrastructure, displacing families and fuelling conflict over fishing grounds.',
                'body' => "Sori Beach Management Unit (BMU) is the largest BMU in Migori County. Pollution from fisheries and related economic activity sits alongside rising water, and the environment, animal health, community health and the local economy are tightly connected.\n\nRising lake levels have destroyed physical infrastructure and displaced people. Fishing vessels lie abandoned, and some fisherfolk have moved on to new locations or other work.\n\nDwindling and unpredictable catches are also a source of conflict. A boat registered under Muhuru BMU was impounded by Aneko BMU officials for intruding on their fishing area. How would a fisher know where one BMU ends and the next begins?",
                'images' => ['/images/flooded-shore.jpg', '/images/abandoned-vessel.jpg', '/images/impounded-boat.jpg'],
                'is_featured' => true,
                'days_ago' => 6,
            ],
            'health-follows-the-livelihood' => [
                'title' => 'Health follows the livelihood',
                'excerpt' => 'A screening outreach at Sori showed why health programmes must work around how people earn a living.',
                'body' => "During a community outreach targeting fishmongers, a community health promoter gave health education on cervical cancer screening, a relatively quick procedure. One woman agreed to go for screening only if the promoter could mind her stock while she was away.\n\nHealth and livelihoods cannot be separated. Programmes that ignore this do not reach the people who need them most.\n\nThe migratory nature of fisherfolk and the power imbalance between men and women also shape how infectious diseases such as HIV and TB spread.",
                'images' => ['/images/health-outreach.jpg'],
                'is_featured' => true,
                'days_ago' => 9,
            ],
            'one-health-on-a-shared-shoreline' => [
                'title' => 'One Health on a shared shoreline',
                'excerpt' => 'People, livestock and wildlife share water, land and food systems on the lakeshore.',
                'body' => "On the lakeshore, people, livestock and wildlife share water, land and food systems. That closeness raises the risk of disease crossing between species and of conflict between people and wildlife.\n\nIt also opens the door to prevention: disease surveillance and early action are easier when human, animal and environmental health are looked at together.",
                'images' => ['/images/market-storks.jpg', '/images/lakeside-cattle.jpg'],
                'is_featured' => false,
                'days_ago' => 12,
            ],
            'why-phds-began-in-lambwe-valley' => [
                'title' => 'Why PHDS began in Lambwe Valley',
                'excerpt' => 'Our founding board comes from the Lake Victoria basin and has seen the poly crisis up close.',
                'body' => "Our story is born from the lived experiences of our founding board of directors, who hail from Lambwe Valley in the Lake Victoria basin of Kenya. This region, like many places on Earth, faces a poly crisis that poses an existential threat to all forms of life.\n\nWe identified unsustainable use of natural resources, policy gaps, the exclusion of local communities from decision making and inadequate financial resourcing as key drivers of poverty, disease and environmental degradation.\n\nThrough reflection and inquiry, we are putting planetary health stewardship into practice as a conscious and unifying approach to promote human development and ecosystem regeneration.",
                'images' => ['/images/landing-site.jpg'],
                'is_featured' => false,
                'days_ago' => 15,
            ],
        ];

        // Posts are attributed to the seeded admin when one exists.
        $author = User::query()->where('email', strtolower((string) config('phds.seed.admin.email')))->first();

        foreach ($posts as $slug => $post) {
            $blog = Blog::firstOrNew(['slug' => $slug]);
            $blog->user_id ??= $author?->id;

            $blog->forceFill([
                'title' => $post['title'],
                'excerpt' => $post['excerpt'],
                'body' => $post['body'],
                'images' => $post['images'],
                'videos' => [],
                'is_featured' => $post['is_featured'],
                'published_at' => now()->subDays($post['days_ago']),
            ])->save();
        }
    }
}
