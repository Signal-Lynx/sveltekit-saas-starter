// FILE: src/lib/data/articles/posts.ts

import { articlesMeta, type ArticleMeta } from "./meta"

export interface ArticlePost {
  slug: string
  contentHtml: string
}

const postsBySlug: Record<string, ArticlePost> = {
  "hr-policy-temporal-duplicates": {
    slug: "hr-policy-temporal-duplicates",
    contentHtml: `
      <p><strong>To: All Staff</strong><br/><strong>Re: Summoning Future Selves for Sprint Closures</strong></p>

      <p>
        It has come to Human Resources' attention that several engineers are using the Timeline C prototype to summon versions 
        of themselves from 6 months in the future to help finish urgent tickets.
      </p>

      <p>
        While we appreciate the initiative to meet deadlines, this practice violates <strong>Section 4.a (Causality Protection)</strong> 
        of the Employee Handbook. Effective immediately, the following rules apply:
      </p>

      <h3>1. Salary is Non-Fungible</h3>
      <p>
        You and your temporal duplicate share <strong>one</strong> salary. We cannot issue two paychecks to the same Social Security Number 
        just because there are physically two of you in the breakroom. If your future self demands payment, that is a personal dispute 
        between you and... you.
      </p>

      <h3>2. No Spoilers</h3>
      <p>
        Asking your future self about the Q4 stock price constitutes Insider Trading. Asking your future self who wins the Super Bowl 
        is just tacky.
      </p>

      <h3>3. The "High-Five" Prohibition</h3>
      <p>
        Please stop high-fiving your duplicates. The resulting kinetic impact of identical matter occupying the same quantum coordinates 
        is shattering the windows on the 4th floor. Maintenance is furious.
      </p>

      <h3>4. Emergency Contacts</h3>
      <p>
        You cannot list your future self as your emergency contact. If you are injured in a lab accident, your future self 
        will likely have already experienced that injury and will simply say, "Yeah, that hurt," which is not medically helpful.
      </p>

      <p>
        <em>If you currently have a duplicate hiding under your desk, please return them to their native time stream before the 
        Friday All-Hands meeting. We didn't order enough pizza.</em>
      </p>
    `,
  },
  "case-file-timeline-b": {
    slug: "case-file-timeline-b",
    contentHtml: `
      <p><em>Warning: This document contains Class 4 cognito-hazards. If you begin to smell toast, close this tab immediately.</em></p>

      <h3>The "Timeline B" Incident</h3>
      <p>
        We frequently get support tickets asking: "If I'm in Timeline A, and I upgrade to Timeline C, what happened to Timeline B?" 
        This is a valid question with a terrifying answer.
      </p>

      <p>
        Timeline B was an experimental branch where we attempted to optimize global productivity by replacing caffeine with 
        atmospheric serotonin. While morale improved by 400%, we inadvertently lowered the planetary defense grid against 
        local fauna evolution.
      </p>

      <h3>The Land Octopuses</h3>
      <p>
        Within six months, cephalopods migrated to land. They are highly intelligent, extremely sticky, and they have unionized. 
        They currently control 80% of the world's supply of copper wire.
      </p>

      <p><strong>Why you cannot visit Timeline B:</strong></p>
      <ul>
        <li>The air pressure fluctuates randomly.</li>
        <li>Your software licenses will not validate because the octopuses ate the servers.</li>
        <li>Humanity mostly lives in trees now.</li>
      </ul>

      <h3>Recommendation</h3>
      <p>
        Stick to Timeline C. Yes, the coffee costs money here, but at least the ground is solid and nothing is trying to 
        negotiate a collective bargaining agreement with your car tires.
      </p>
      
      <p>
        <em>If you accidentally shift into Timeline B, do not make eye contact with the squirrels. They work for the octopuses now.</em>
      </p>
    `,
  },
}

export function getArticle(
  slug: string,
): { meta: ArticleMeta; post: ArticlePost } | null {
  const meta = articlesMeta.find((m) => m.slug === slug)
  const post = postsBySlug[slug]
  if (!meta || !post) return null
  return { meta, post }
}
