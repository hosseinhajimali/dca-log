export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  sections: { heading?: string; body: string }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'what-is-dollar-cost-averaging',
    title: 'What is Dollar Cost Averaging (DCA)?',
    excerpt: 'Dollar cost averaging is one of the simplest and most effective investing strategies. Here is how it works, why it removes emotion from investing, and how to get started.',
    date: '2026-05-01',
    readTime: '5 min read',
    category: 'Basics',
    sections: [
      {
        body: 'Dollar cost averaging (DCA) is an investment strategy where you invest a fixed amount of money at regular intervals, regardless of the asset price. Instead of trying to time the market, you buy consistently, weekly, bi-weekly, or monthly, and let the math work in your favour over time.',
      },
      {
        heading: 'How it works',
        body: 'Say you decide to invest $100 in Bitcoin every week. Some weeks Bitcoin is up and your $100 buys less. Other weeks it is down and your $100 buys more. Over time, this averages out your cost per coin, you never buy all at the top, and you never miss the bottom entirely. This is the core mechanic of DCA: your average purchase price smooths out across market cycles.',
      },
      {
        heading: 'A simple example',
        body: 'Imagine you invest $100 per week over four weeks. Week one: Bitcoin is at $80,000, so you get 0.00125 BTC. Week two: it drops to $60,000, so you get 0.00167 BTC. Week three: it recovers to $70,000, so you get 0.00143 BTC. Week four: it rises to $90,000, so you get 0.00111 BTC. You invested $400 total and accumulated 0.00546 BTC. Your average cost per coin is about $73,260 well below the $90,000 current price. A lump sum buyer who bought everything at week one paid $80,000 per coin.',
      },
      {
        heading: 'Why DCA works psychologically',
        body: 'The biggest enemy of retail investors is emotion. We buy when prices are high because everything looks optimistic, and we sell when prices are low because fear takes over. DCA removes that decision entirely. You set your plan once and execute it automatically. There is no "should I buy now or wait?", the answer is always the same: yes, it is time to buy.',
      },
      {
        heading: 'Who DCA is best for',
        body: 'DCA suits anyone who cannot or does not want to predict market timing, which is most people, including professional fund managers. It is especially powerful for volatile assets like Bitcoin and Ethereum, where price swings of 30% to 50% are common. The volatility that scares most people actually helps DCA investors accumulate more coins during dips.',
      },
      {
        heading: 'The limits of DCA',
        body: 'DCA is not magic. In a purely rising market, a lump sum investment on day one will outperform DCA because you owned more of the asset during its appreciation. But most people do not invest in a straight line, they invest gradually over time as they earn income. For real-world investors, DCA is both practical and psychologically sustainable in a way that lump sum investing is not.',
      },
      {
        heading: 'How to track your DCA strategy',
        body: 'The hardest part of DCA is keeping track. What is your average cost basis? How much have you invested in total? What is your current return? DCAlog is built specifically to answer these questions. You log each purchase, the app tracks your cost basis automatically, and you can see exactly where you stand at any point in time.',
      },
    ],
  },

  {
    slug: 'dca-vs-lump-sum-investing',
    title: 'DCA vs Lump Sum Investing: Which Strategy Wins?',
    excerpt: 'The debate between dollar cost averaging and lump sum investing has a clear mathematical answer, but math is not the whole story. Here is an honest comparison.',
    date: '2026-05-05',
    readTime: '6 min read',
    category: 'Strategy',
    sections: [
      {
        body: 'The debate between dollar cost averaging (DCA) and lump sum investing is one of the most common in personal finance. The academic answer might surprise you, but the practical answer is more nuanced.',
      },
      {
        heading: 'What the research says',
        body: 'Multiple studies, including work by Vanguard, have found that lump sum investing outperforms DCA roughly two-thirds of the time when applied to diversified stock market indices. The reason is simple: markets tend to go up over long periods. If you invest everything immediately, your money spends more time in the market, compounding returns.',
      },
      {
        heading: 'Why that research does not tell the whole story',
        body: 'The studies assume you have a large lump sum available to invest right now. Most people do not. They earn a salary, save a portion each month, and invest gradually. For these investors, the majority, DCA is not a choice between strategies, it is simply the natural result of how money flows into their lives.',
      },
      {
        heading: 'Where DCA genuinely wins: crypto markets',
        body: 'Crypto markets behave very differently from stock indices. Bitcoin has experienced drawdowns of 50%, 70%, and even 80% from its peaks multiple times. In these conditions, DCA dramatically outperforms lump sum investing. An investor who put everything into Bitcoin in November 2021 at $69,000 waited over two years to break even. An investor who DCA-ed throughout 2022 and 2023 accumulated coins at an average price well below $30,000 and was significantly profitable by 2024.',
      },
      {
        heading: 'The psychological reality',
        body: 'Even if lump sum were mathematically optimal in all conditions, most people cannot emotionally execute it. Investing your entire savings in one moment requires a level of conviction that is rare. The anxiety of watching a large investment drop 30% in a month causes most people to sell at the worst possible time. DCA investors, by contrast, often welcome dips because they know their next purchase will be cheaper.',
      },
      {
        heading: 'A hybrid approach worth considering',
        body: 'Some investors use a combination: invest a base DCA amount each week regardless of conditions, then invest additional amounts when the market drops significantly. This is where smart buying rules come in, you define a rule that says "if Bitcoin drops 40% from its ATH, I will invest 2x my normal amount." This way you benefit from volatility without abandoning your regular schedule.',
      },
      {
        heading: 'The verdict',
        body: 'Lump sum has a slight mathematical edge in steadily rising markets. DCA has a significant practical and psychological edge for most real-world investors, especially in volatile asset classes. The best strategy is the one you can actually stick to, and most people stick to DCA because it is systematic, unemotional, and fits naturally into how they earn and save.',
      },
    ],
  },

  {
    slug: 'bitcoin-dca-strategy-guide',
    title: 'How to Build a Bitcoin DCA Strategy in 2026',
    excerpt: 'A practical guide to setting up a Bitcoin DCA plan that accounts for market conditions, drawdowns, and your own financial situation.',
    date: '2026-05-10',
    readTime: '7 min read',
    category: 'Guide',
    sections: [
      {
        body: 'Bitcoin is the most widely DCA-ed crypto asset in the world for good reason. Its volatility is high, its long-term trajectory has historically been upward, and its cycles are relatively predictable in shape if not in timing. Here is how to build a solid DCA strategy for Bitcoin.',
      },
      {
        heading: 'Step 1: Decide how much to invest per period',
        body: 'Start with an amount you would be comfortable investing even if Bitcoin dropped 50% the next day. This is not about pessimism, it is about sustainability. If you invest more than you can afford to hold through a downturn, you will panic sell at the worst time. A common starting point is 5% to 10% of your monthly savings.',
      },
      {
        heading: 'Step 2: Choose your frequency',
        body: 'Weekly tends to outperform monthly DCA in volatile markets because you capture more price points. The difference is not enormous, but weekly also keeps you more engaged with your strategy. Bi-weekly (every two weeks) is a good middle ground that aligns with many salary schedules.',
      },
      {
        heading: 'Step 3: Add drawdown rules',
        body: 'A flat DCA schedule is good. A DCA schedule with drawdown rules is better. The idea is simple: when Bitcoin is significantly below its all-time high, you buy more. You might define three tiers, at 30% below ATH, invest 1.5x your normal amount; at 50% below ATH, invest 2x; at 70% below ATH, invest 3x. This accelerates accumulation during bear markets when fear is highest and prices are best.',
      },
      {
        heading: 'Step 4: Define your take-profit rules',
        body: 'Having an exit plan is just as important as having an entry plan. Many DCA investors never sell because they have no rule for when to do so, and end up watching profits evaporate in the next cycle. Consider setting sell rules tied to your profit percentage, for example, sell 10% of your holdings when your P&L reaches +50%, another 10% at +100%, and so on. This lets you realise gains systematically without trying to call the top.',
      },
      {
        heading: 'Step 5: Track everything',
        body: 'Your DCA strategy is only as good as your ability to see how it is performing. Track your average cost basis, total invested, current value, and P&L. Without this visibility, you are flying blind and much more likely to make emotional decisions. DCAlog is built exactly for this, it tracks every purchase, calculates your cost basis automatically, and shows you your buying and sell rules in the context of current market conditions.',
      },
      {
        heading: 'Step 6: Stick to the plan',
        body: 'The hardest part of any DCA strategy is continuing to buy when the news is terrible and prices are falling. This is also the most important part. Every major Bitcoin bear market has been followed by a new all-time high. The investors who bought consistently through 2018, 2020, and 2022 were significantly rewarded. The ones who stopped buying "until things calmed down" missed the best prices.',
      },
      {
        heading: 'Common mistakes to avoid',
        body: 'Do not DCA into an asset you do not understand well enough to hold through an 80% drawdown. Do not invest money you might need in the next two years. Do not skip your scheduled buys because the price feels "too high right now", that thinking defeats the entire purpose of the strategy. And do not forget to track your cost basis for tax purposes.',
      },
    ],
  },

  {
    slug: 'how-to-calculate-crypto-cost-basis',
    title: 'How to Calculate Your Crypto Cost Basis',
    excerpt: 'Understanding your cost basis is essential for tracking performance and filing accurate taxes. Here is how the weighted average cost method works and why it matters.',
    date: '2026-05-14',
    readTime: '5 min read',
    category: 'Tax & Tracking',
    sections: [
      {
        body: 'If you buy crypto multiple times at different prices, your cost basis is the average price you paid per unit. Knowing this number is fundamental to understanding your true profit or loss, and to filing correct tax returns.',
      },
      {
        heading: 'What is cost basis?',
        body: 'Cost basis is the original value of an asset for tax purposes. When you eventually sell, your taxable gain or loss is calculated as the sale price minus your cost basis. If you bought Bitcoin at $50,000 and sell at $80,000, your gain is $30,000 per coin. But if you bought at multiple prices, you need a method to calculate which coins you sold and at what cost.',
      },
      {
        heading: 'The weighted average cost method (WAC)',
        body: 'WAC is the simplest and most commonly used method for DCA investors. Instead of tracking individual purchases, you calculate one average price across all your buys. The formula is: total amount invested divided by total units held. If you invested $1,000 in four purchases and hold 0.013 BTC, your average cost is $76,923 per BTC. Every time you buy more, the average updates.',
      },
      {
        heading: 'WAC vs FIFO',
        body: 'FIFO (first in, first out) assumes that when you sell, you are selling your oldest coins first. In a rising market, this typically results in higher taxable gains because your oldest coins were bought cheapest. WAC averages everything together, which often produces a more predictable tax outcome. Most DCA investors prefer WAC because it reflects the reality of their strategy, they are not buying and selling specific lots, they are managing a position.',
      },
      {
        heading: 'Why it matters for DCA investors',
        body: 'DCA investors make many small purchases over time. Tracking each purchase individually becomes unmanageable quickly. With 52 weekly buys in a year, you would have 52 separate cost lots to track under FIFO. WAC collapses all of that into a single number that updates with each purchase, making reporting dramatically simpler.',
      },
      {
        heading: 'What counts toward your cost basis',
        body: 'Your cost basis includes the purchase price plus any fees paid to acquire the asset. If you bought $100 of Bitcoin and paid a $2 exchange fee, your cost basis is $102 for that purchase. Missing fees is a common mistake that leads to overstating your gains, always include them.',
      },
      {
        heading: 'How DCAlog tracks your cost basis',
        body: 'DCAlog uses the weighted average cost method automatically. Every time you log a purchase, the app recalculates your average cost across all holdings for that asset. The Tax Report page gives you a yearly breakdown of your buy activity, your WAC, and your cost basis summary, everything you need to hand to your accountant or fill in your tax return. Only purchase transactions are included, so the numbers stay clean.',
      },
      {
        heading: 'A note on tax jurisdictions',
        body: 'Tax treatment of crypto varies significantly by country. In some jurisdictions WAC is the required method; in others FIFO is mandated. DCAlog is a tracking tool, not tax advice, always confirm the rules in your country with a qualified accountant before filing.',
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}
