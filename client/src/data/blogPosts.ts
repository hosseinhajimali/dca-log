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
  {
    slug: 'crypto-fear-and-greed-index-explained',
    title: 'The Crypto Fear & Greed Index Explained',
    excerpt: 'The Fear & Greed Index is one of the most watched sentiment indicators in crypto. Here is what it measures, how it is calculated, and how smart investors use it to make better decisions.',
    date: '2026-05-20',
    readTime: '6 min read',
    category: 'Strategy',
    sections: [
      {
        body: 'Markets are driven by two emotions above everything else: fear and greed. When investors are fearful, they sell, prices drop, and opportunities are created. When investors are greedy, they buy, prices rise, and risk builds up. The Crypto Fear & Greed Index tries to put a number on where the market sits on that spectrum at any given moment.',
      },
      {
        heading: 'What is the Fear & Greed Index?',
        body: 'The Crypto Fear & Greed Index is a daily sentiment indicator that scores market emotion on a scale from 0 to 100. A score of 0 means "Extreme Fear", the market is panicking and most participants are selling. A score of 100 means "Extreme Greed", the market is euphoric and everyone wants in. The index was originally popularised by CNN for stock markets and was later adapted for crypto by Alternative.me, where it became a daily reference point for Bitcoin and the broader market.',
      },
      {
        heading: 'How is it calculated?',
        body: 'The index combines several data sources into one weighted score. Volatility accounts for 25% of the score, high volatility relative to recent averages signals fear. Market momentum and volume account for another 25%, strong buying volume in a rising market signals greed. Social media sentiment makes up 15%, measuring the volume and positivity of crypto-related posts. Bitcoin dominance contributes 10%, when Bitcoin dominance rises, it often means investors are rotating out of altcoins into safety, which signals fear. Google Trends data for crypto-related searches makes up the final 10%, with rising searches for terms like "Bitcoin crash" indicating fear. The remaining 15% comes from surveys, which are currently paused. Each component is normalised and combined into the single 0-to-100 score.',
      },
      {
        heading: 'How the index moves with the market',
        body: 'The index tends to lead or coincide with major market moves. During the Bitcoin crash of May 2021, the index dropped to single digits, extreme fear, right as prices were bottoming. During the bull run of late 2021, it held above 70 for months before crashing with the market in November. In the 2022 bear market, it stayed in fear territory for almost the entire year, rarely climbing above 30. Each of these periods created the conditions that defined the next cycle: the extreme fear of 2022 was the accumulation opportunity of a generation for DCA investors.',
      },
      {
        heading: 'Warren Buffett\'s rule and why it applies to crypto',
        body: 'Warren Buffett famously said: "Be fearful when others are greedy, and greedy when others are fearful." The Fear & Greed Index is essentially a tool for measuring exactly that. When the index is in extreme fear, it does not guarantee prices will go up tomorrow, but it historically indicates that long-term investors are being offered assets at distressed prices. When the index is in extreme greed, it does not mean a crash is imminent, but it does suggest that a significant portion of upside may already be priced in and risk is elevated.',
      },
      {
        heading: 'What the index does not tell you',
        body: 'The Fear & Greed Index is a sentiment snapshot, not a prediction engine. It reflects what has already happened in the market over the past day or week. It does not account for macro events, regulatory developments, or on-chain fundamentals. A reading of 15 means the market is fearful right now, it does not mean prices cannot fall further. Experienced investors treat it as one signal among many, not as a buy or sell trigger on its own.',
      },
      {
        heading: 'How DCA investors should use it',
        body: 'For DCA investors, the Fear & Greed Index is most useful as a context layer on top of a disciplined strategy. If your plan is to invest $100 in Bitcoin every week, the index does not change that plan. But it can inform your buying rules. Many DCA investors set rules that increase their investment amount when the index is in extreme fear territory, for example buying 2x their normal amount when the index drops below 20. This is a systematic way to act on Buffett\'s principle without relying on gut feeling. DCAlog shows the current Fear & Greed score on your dashboard precisely for this reason, so you always have that context when reviewing your active plans.',
      },
      {
        heading: 'The bottom line',
        body: 'The Fear & Greed Index is not a crystal ball. But it is a reliable mirror of crowd sentiment, and crowd sentiment is one of the most powerful forces in crypto markets. When everyone is running for the exit, that is often when patient, systematic investors are building their best positions. When everyone is celebrating new highs, that is often when discipline matters most. Track the index, understand what it measures, and let it inform the rules around your DCA strategy rather than your emotional reaction to the market.',
      },
    ],
  },
  {
    slug: 'ath-drawdown-dca-strategy',
    title: 'What is ATH Drawdown and Why It Should Change How Much You Buy',
    excerpt: 'All-time high drawdown is one of the most powerful signals in a DCA strategy. Understanding it can turn a basic recurring buy into a smart, market-aware investment system.',
    date: '2026-05-26',
    readTime: '7 min read',
    category: 'Strategy',
    sections: [
      {
        body: 'Most DCA investors invest the same fixed amount every week or month, no matter what the market is doing. That is a perfectly solid strategy. But there is a smarter variation that keeps the discipline of DCA while taking advantage of market conditions: adjusting how much you buy based on how far an asset is below its all-time high. This is where ATH drawdown comes in.',
      },
      {
        heading: 'What is an all-time high?',
        body: 'An all-time high (ATH) is the highest price an asset has ever reached. For Bitcoin, the ATH in late 2021 was around $69,000. By late 2022, the price had fallen to roughly $16,000. For Ethereum, gold, or any other asset, the same principle applies: there is a peak price in history, and the current price is either at that peak, near it, or somewhere below it.',
      },
      {
        heading: 'What is ATH drawdown?',
        body: 'ATH drawdown is simply how far the current price is below the all-time high, expressed as a percentage. If Bitcoin hit an ATH of $100,000 and is now trading at $70,000, the drawdown is 30%. If it falls to $50,000, the drawdown is 50%. A drawdown of 0% means the asset is at its all-time high right now. A drawdown of 80% means the price has fallen 80% from its peak, which has happened to Bitcoin multiple times in its history.',
      },
      {
        heading: 'Why drawdown is a more useful signal than price',
        body: 'Raw price tells you very little on its own. Knowing that Bitcoin is at $60,000 does not tell you if that is cheap or expensive. But knowing that Bitcoin is 40% below its all-time high tells you something meaningful: the market has already corrected significantly from its most euphoric point. Drawdown gives you context. It anchors the current price to a historical reference point and lets you assess where you are in the cycle in a way that a raw price number cannot.',
      },
      {
        heading: 'How drawdown-based buying rules work',
        body: 'The idea is straightforward. Instead of always investing the same amount, you invest more when the drawdown is large and stick to your base amount when the market is near its highs. You define tiers. For example: when drawdown is between 0% and 20%, invest your standard amount. When drawdown is between 20% and 40%, invest 1.5 times your standard amount. When drawdown is between 40% and 60%, invest 2 times your standard amount. When drawdown is above 60%, invest 3 times your standard amount. These rules run automatically alongside your regular DCA schedule. You do not have to check prices or make judgment calls. The system does it for you.',
      },
      {
        heading: 'The math behind why this works',
        body: 'DCA already lowers your average cost over time by buying at a mix of prices. Drawdown rules accelerate that effect by concentrating more of your buying power at the lowest prices. Consider two investors, both running a weekly Bitcoin DCA. Investor A always buys $100. Investor B buys $100 normally but doubles to $200 when Bitcoin is more than 40% below ATH. During a bear market where Bitcoin spends six months in that range, Investor B accumulates significantly more Bitcoin at the cheapest prices. When the market recovers, their average cost is lower and their total holdings are larger.',
      },
      {
        heading: 'This is not market timing',
        body: 'A common concern is that this sounds like trying to time the market. It is not. Market timing means making discretionary decisions about when to buy or sell based on predictions about future price movements. Drawdown-based rules are purely mechanical. You are not predicting anything. You are defining rules in advance and executing them automatically. The schedule still runs. The only thing that changes is the size of the purchase, based on an objective mathematical relationship between the current price and a historical reference point.',
      },
      {
        heading: 'Works for any asset, not just Bitcoin',
        body: 'ATH drawdown is a useful signal for any volatile asset with a clear price history. Gold has its own ATH and its own drawdown cycles. Ethereum, Solana, silver, and broad equity ETFs all move in cycles relative to their historical peaks. The same logic applies across all of them. If you are running a multi-asset DCA portfolio, you can set drawdown rules per asset, so each asset gets more buying power precisely when it is most discounted relative to its own history.',
      },
      {
        heading: 'Setting realistic thresholds',
        body: 'The right thresholds depend on the asset. Bitcoin has historically experienced drawdowns of 50% to 85% from ATH during major bear markets, so rules that trigger at 30%, 50%, and 70% make sense. Gold is far less volatile and rarely drops more than 30% from ATH, so tighter thresholds like 10% and 20% are more appropriate. The key is to look at the historical drawdown range for each asset and design your tiers to cover the realistic scenarios, not hypothetical extremes that will never trigger.',
      },
      {
        heading: 'What about when the asset is near its ATH?',
        body: 'When drawdown is low, between 0% and 15%, you are buying near the top of the cycle. This feels uncomfortable but it is still the right move. You continue your base DCA amount. The discipline of continuing to buy near ATH is what keeps your accumulation consistent across the whole cycle, not just during the cheap periods. Stopping your DCA when prices are high means you only accumulate during dips, which sounds smart but actually leaves you underexposed during the early stages of a new bull market.',
      },
      {
        heading: 'How to track it automatically',
        body: 'The practical challenge with drawdown-based rules is knowing the current drawdown for each asset at all times and remembering to adjust your purchase size accordingly. This is exactly the problem DCAlog solves. The app fetches ATH data for your assets, calculates the current drawdown in real time, and shows you which buying rules are active based on where each asset sits today. When you open your dashboard, you can see immediately whether your plan is in its base mode or whether a buying rule has been triggered, so you always know the right amount to invest on your next purchase date.',
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}
