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
  {
    slug: 'multi-asset-dca-bitcoin-ethereum-gold',
    title: 'Multi-Asset DCA: Should You DCA Bitcoin, Ethereum, and Gold Together?',
    excerpt: 'Running a single-asset DCA is a great start. But splitting your regular investment across Bitcoin, Ethereum, and gold can reduce risk and improve long-term outcomes. Here is how to think about it.',
    date: '2026-06-01',
    readTime: '7 min read',
    category: 'Strategy',
    sections: [
      {
        body: 'Most people start their DCA journey with a single asset, usually Bitcoin. That is a perfectly reasonable entry point. But as your strategy matures, a question naturally arises: should you spread your regular investment across multiple assets? The answer depends on your goals, but for most long-term investors, multi-asset DCA offers meaningful advantages over concentrating everything in one place.',
      },
      {
        heading: 'Why single-asset DCA has a blind spot',
        body: 'DCA is excellent at smoothing your entry price over time. What it cannot do is protect you if the asset you are buying permanently underperforms or, in the worst case, loses its relevance. Bitcoin has a strong track record, but crypto history is littered with assets that dominated for a cycle and then faded. Spreading your DCA across a small number of uncorrelated assets means that even if one disappoints, the others can carry the portfolio.',
      },
      {
        heading: 'The case for Bitcoin as your anchor',
        body: 'Bitcoin remains the most established, most liquid, and most widely held crypto asset. Its fixed supply of 21 million coins and its growing institutional adoption make it the closest thing to a reserve asset in the crypto world. For most investors, Bitcoin should form the largest share of a multi-asset DCA portfolio, typically 50% to 70% of the total recurring investment. It is the foundation everything else builds on.',
      },
      {
        heading: 'Why Ethereum belongs in the mix',
        body: 'Ethereum is not just a speculative asset like Bitcoin. It is the backbone of a large and growing ecosystem of applications, smart contracts, and financial infrastructure. Its value is tied to the usage of that network, fees paid, applications deployed, assets settled on-chain. This gives Ethereum a different return profile from Bitcoin. The two assets are correlated in broad market moves (both rise in bull markets and fall in bear markets) but diverge significantly in cycles. Ethereum has outperformed Bitcoin dramatically in some periods and underperformed badly in others. Running a DCA on both means you capture whichever leads in the next cycle without having to predict which one it will be.',
      },
      {
        heading: 'Gold as a stabiliser',
        body: 'Gold behaves very differently from crypto. It does not have the same upside, but it also does not have the same downside. In periods of macro stress, banking crises, currency devaluations, or geopolitical instability, gold tends to hold its value or rise while crypto often falls. Including gold in your DCA portfolio reduces overall volatility and provides a cushion during the worst crypto bear markets. For investors with a longer time horizon or a lower risk tolerance, even a 10% to 20% allocation to gold within a regular investment plan can meaningfully reduce drawdowns.',
      },
      {
        heading: 'Correlation: when it matters and when it does not',
        body: 'Bitcoin and Ethereum are highly correlated in the short term. When crypto markets sell off, both fall together. Over longer periods, however, their cycles diverge enough to create real diversification benefits. Gold is more structurally uncorrelated from crypto, driven by different macro factors: real interest rates, dollar strength, central bank demand. The key insight is that correlation is not constant. Assets that move together in a panic often diverge significantly over multi-year periods, which is exactly the time horizon DCA is designed for.',
      },
      {
        heading: 'How to split your recurring investment',
        body: 'There is no single right answer, but here are three common approaches. A conservative split might be 50% Bitcoin, 20% Ethereum, 30% gold, prioritising stability and the gold cushion. A balanced split might be 60% Bitcoin, 30% Ethereum, 10% gold, leaning into crypto with a small gold hedge. An aggressive split might be 50% Bitcoin, 50% Ethereum, no gold, for investors who want maximum crypto exposure and are comfortable with deeper drawdowns. The right choice depends on how much drawdown you can stomach without changing your plan, and how much you believe in Ethereum specifically.',
      },
      {
        heading: 'Setting buying rules per asset',
        body: 'One of the real advantages of multi-asset DCA is that each asset can have its own buying rules based on its own ATH drawdown. Bitcoin and Ethereum have very different historical drawdown profiles. Bitcoin has dropped 80% from ATH in past cycles; Ethereum has dropped even more. Gold rarely falls more than 30% from ATH. This means your drawdown tiers should be calibrated per asset. Your Bitcoin buying rule might trigger extra purchases at 40% below ATH, your Ethereum rule at 50% below ATH, and your gold rule at 15% below ATH. Each asset gets smarter accumulation rules tuned to its own volatility.',
      },
      {
        heading: 'Rebalancing vs fixed splits',
        body: 'Over time, a winning asset will grow to represent a larger share of your portfolio than you intended. Some investors rebalance periodically, selling some of the winner to buy more of the laggard, to maintain their target allocation. Others prefer to let winners run and simply adjust the split of new purchases rather than selling anything. For DCA investors, the simpler approach is usually to adjust your recurring purchase amounts rather than sell. If Bitcoin has grown to represent 80% of your portfolio and you wanted 60%, you reduce your Bitcoin DCA amount and increase Ethereum and gold for the next several months until the split is back where you want it.',
      },
      {
        heading: 'Tracking a multi-asset portfolio',
        body: 'The complexity of multi-asset DCA is mostly in the tracking. You need to know your average cost basis per asset, your total invested per asset, and your overall portfolio value and return, all at once. This is exactly what DCAlog is designed for. You can run separate plans for Bitcoin, Ethereum, and gold, each with its own schedule and buying rules, while the dashboard shows you your total portfolio picture in one place. The cost basis calculation runs per asset, so your Bitcoin average and your Ethereum average are tracked independently, which also makes tax reporting cleaner.',
      },
      {
        heading: 'The bottom line',
        body: 'Multi-asset DCA is not about chasing diversification for its own sake. It is about building a portfolio that can survive the inevitable periods when your primary asset is down 60% and you are still buying. Having Ethereum and gold in the mix means that at least some of your capital is likely performing better during those periods, which makes it psychologically easier to stick to the plan. And sticking to the plan, across multiple assets, through multiple cycles, is where the real returns are built.',
      },
    ],
  },
  {
    slug: 'dca-take-profit-strategy',
    title: 'DCA Take-Profit Strategy: When and How to Sell',
    excerpt: 'Most DCA investors have a clear plan for buying, but no plan for selling. Here is how to build a systematic take-profit strategy that lets you realise gains without trying to call the top.',
    date: '2026-06-05',
    readTime: '7 min read',
    category: 'Strategy',
    sections: [
      {
        body: 'Dollar cost averaging gives you a disciplined framework for buying. But the question most DCA investors never answer is: when do I sell? Without a plan, the answer tends to be "never" during bear markets when prices are falling, and "not yet" during bull markets when prices keep rising. Both of those answers leave returns on the table. A systematic take-profit strategy solves this.',
      },
      {
        heading: 'Why most DCA investors never sell',
        body: 'The same discipline that makes DCA investors good buyers makes them bad sellers. They are conditioned to hold through volatility, to not react to price movements, to think long-term. That mindset is an asset during downturns. But without sell rules, it becomes a liability at the top of a cycle. Investors watch their portfolio peak at 200% gains, tell themselves it will go higher, and end up holding through the next 70% crash back down. A take-profit strategy does not require you to call the top. It just requires you to decide in advance what gains are worth realising.',
      },
      {
        heading: 'The core principle: sell in stages, not all at once',
        body: 'The biggest mistake in take-profit planning is treating it as a single event. "I will sell when Bitcoin hits $150,000" is not a strategy. It is a bet on a specific price target. Markets rarely cooperate with single price targets, and if they do, it is usually only briefly before reversing. A better approach is staged selling: take out a portion of your position at each target level, locking in gains progressively rather than gambling on one exit point. This way you always sell some on the way up, you never sell everything at the wrong time, and you keep skin in the game if the asset continues higher.',
      },
      {
        heading: 'Profit-based tiers: the simplest approach',
        body: 'The cleanest way to define take-profit rules is as a percentage of your unrealised gain above your average cost basis. You are not predicting a price, you are reacting to your own performance. A typical structure might look like this: when your position is up 50% from your average cost, sell 10% of your holdings. When it is up 100%, sell another 15%. When it is up 200%, sell another 20%. When it is up 300%, sell another 25%. Each sale reduces your position slightly while leaving most of your holdings to benefit from further upside. The percentages you sell at each tier are yours to decide based on your goals, but the structure should be defined before you need it, not in the heat of a bull market.',
      },
      {
        heading: 'Price-based tiers: anchoring to the market cycle',
        body: 'An alternative to profit-based tiers is price-based tiers, where you define specific price levels for each asset that trigger a partial sale. This approach works well for assets like Bitcoin where cycle peaks have historically followed recognisable patterns. You might define tiers at $100,000, $150,000, and $200,000, selling 10% to 15% of your holdings at each level. The advantage is simplicity. The risk is that your target prices may never be reached in a given cycle, leaving your rules untriggered. Combining price targets with profit percentages gives you the best of both: price targets anchor your plan to the market, and profit tiers ensure you still realise gains even if the market does not reach your targets.',
      },
      {
        heading: 'Time-based selling: the underrated option',
        body: 'A third approach, less discussed but highly practical, is time-based selling. Instead of waiting for a price or profit level, you sell a fixed percentage of your holdings on a regular schedule, for example 5% per quarter once your position is in profit. This turns your DCA buy discipline into an equally disciplined sell discipline. The advantage is that it forces regular profit-taking regardless of market conditions, removes emotion from the timing decision, and naturally accelerates selling as your position grows. The downside is that you may sell during a period when the asset is underperforming, though over time the regularity tends to produce better outcomes than waiting for the "right" moment.',
      },
      {
        heading: 'What to do with the proceeds',
        body: 'Selling is only half of the decision. The other half is what you do with the capital. Three common approaches: move to stablecoins to preserve gains in crypto-native form while staying on-chain; convert to fiat and hold in a high-yield savings account while you wait for the next cycle; or redeploy into a safer asset like gold or a broad market ETF. The right choice depends on your overall financial situation and time horizon. For investors who expect another crypto cycle within a few years, stablecoins or gold are popular holding positions that keep you ready to redeploy when the next bear market creates buying opportunities.',
      },
      {
        heading: 'Tax implications of selling',
        body: 'Every sale is a taxable event in most jurisdictions. When you trigger a take-profit rule and sell 10% of your Bitcoin, you are realising a capital gain equal to the difference between your average cost basis and the sale price, multiplied by the amount sold. The tax rate depends on your country and how long you have held the asset. In many jurisdictions, assets held for more than one year qualify for a lower long-term capital gains rate. This is worth factoring into your tier structure: if you are close to the one-year mark on a large portion of your holdings, it may be worth waiting a few weeks before triggering a sale to qualify for better tax treatment. Always consult a qualified accountant for advice specific to your situation.',
      },
      {
        heading: 'The biggest mistake: no plan at all',
        body: 'Investors who have no take-profit plan tend to follow one of two paths. Either they never sell and ride their gains all the way through the next bear market, turning a 200% gain into a 30% gain. Or they panic-sell everything at once when they see the market start to turn, crystallising a fraction of the gains they would have taken with a staged approach. Both outcomes are avoidable with even a simple, pre-defined sell structure. The plan does not need to be sophisticated. It just needs to exist before you need it.',
      },
      {
        heading: 'How to set sell rules in DCAlog',
        body: 'DCAlog lets you define take-profit rules alongside your buying plan so that your full strategy lives in one place. You set your sell tiers based on profit percentage or price targets, and the app shows you in real time which rules are currently active based on your average cost and the current market price. When a rule triggers, you see it on your dashboard immediately. You always know what your plan says to do, without having to do the mental arithmetic yourself in the middle of a bull run when clarity is hardest to maintain.',
      },
    ],
  },
  {
    slug: 'dca-frequency-daily-weekly-monthly',
    title: 'DCA Frequency: Daily, Weekly, or Monthly? What Actually Matters',
    excerpt: 'Does buying every day beat buying once a month? The data says the difference is smaller than you think, but fees, consistency, and psychology can make one frequency clearly better for you.',
    date: '2026-06-10',
    readTime: '6 min read',
    category: 'Strategy',
    sections: [
      {
        body: 'Once you have decided to dollar cost average, the next question is always the same: how often should I buy? Daily, weekly, bi-weekly, or monthly? It feels like an important decision, and in some ways it is, but probably not for the reasons you expect. The raw return difference between frequencies is tiny. What actually separates a good schedule from a bad one is fees, consistency, and whether you can stick to it.',
      },
      {
        heading: 'The math: frequency barely changes your average cost',
        body: 'Backtests across Bitcoin’s history show that daily, weekly, and monthly DCA over the same period and the same total capital end up within roughly 1% to 2% of each other in final cost basis. This makes intuitive sense. All three schedules sample the same price curve, just at different resolutions. Over months and years, the samples converge toward the same average price. Anyone telling you that daily DCA dramatically outperforms monthly DCA is describing luck in a specific window, not a structural edge. The frequency decision should therefore be made on practical grounds, not on expected return.',
      },
      {
        heading: 'Fees: where frequency really costs you',
        body: 'Fees are the one place where frequency has a direct, predictable impact. Many exchanges charge a minimum fee or a higher percentage on small orders. If your budget is $200 per month and you split it into daily buys of about $6.50, a $0.99 minimum fee would consume over 15% of every purchase. The same $200 as a single monthly buy might cost 0.5% in fees. As a rule of thumb: the smaller your monthly budget, the less frequently you should buy. Below roughly $100 per month, monthly buys usually make sense. Between $100 and $500, weekly or bi-weekly is reasonable on a low-fee exchange. Daily DCA only makes sense with larger budgets or fee-free recurring purchase programs.',
      },
      {
        heading: 'Volatility capture: the case for buying more often',
        body: 'The argument for higher frequency is volatility capture. Crypto can move 10% in a day, and a monthly buyer might miss a sharp dip entirely while a weekly buyer catches it. Higher frequency smooths your entry across more price points, which slightly reduces the variance of your outcome. You are less likely to get unlucky with a monthly buy that happens to land on a local top. Note that this cuts both ways: you are also less likely to get lucky and land on a local bottom. Higher frequency narrows the range of outcomes, it does not improve the average outcome.',
      },
      {
        heading: 'Psychology: the schedule you keep is the one that works',
        body: 'The best frequency on paper is worthless if you abandon it in practice. Some investors find daily buys reassuring, every red day is a small discount, and the habit keeps them engaged. Others find daily exposure exhausting and are better served by a monthly buy they barely think about. There is also the income-matching argument: if you are paid monthly, buying monthly right after payday means the money is invested before you can spend it. Matching your DCA schedule to your salary cycle is one of the most reliable ways to stay consistent for years.',
      },
      {
        heading: 'Combining frequency with buying rules',
        body: 'Frequency does not have to be a fixed-amount decision. A popular hybrid is a base schedule with dynamic sizing: buy weekly, but scale the amount based on how far the asset is below its all-time high. This keeps the discipline of a regular schedule while letting you accumulate more aggressively during drawdowns. In DCAlog you can attach buying rules to any plan, so a weekly plan might buy 1x the base amount near the ATH, 1.5x at 20% below, and 2x at 40% below. The schedule provides consistency; the rules provide opportunism.',
      },
      {
        heading: 'What about bi-weekly?',
        body: 'Bi-weekly is the quiet favourite of many long-term DCA investors, and for good reason. It keeps individual purchases large enough that fees stay negligible, it samples the market twice as often as monthly, and it maps neatly onto bi-weekly pay cycles. If you are unsure where to start and your budget is moderate, bi-weekly is a sensible default that you will rarely regret.',
      },
      {
        heading: 'The bottom line',
        body: 'Pick the highest frequency at which your fees stay below roughly 1% per purchase, then adjust for your own psychology and pay cycle. If that means monthly, buy monthly without guilt, the long-term return difference versus daily is noise. What matters is that the schedule survives contact with a bear market. Whichever frequency you choose, DCAlog tracks every purchase, shows your true average cost across the whole history, and makes it easy to compare how your plan is performing, so the only thing left to do is keep buying.',
      },
    ],
  },

  {
    slug: 'we-backtested-our-own-buying-rules',
    title: 'We Backtested Our Own Buying Rules. Plain DCA Almost Won.',
    excerpt: 'We built a backtesting feature to prove that smart drawdown rules beat plain DCA. Then we ran it. Here is what the data actually says, and why we are publishing it anyway.',
    date: '2026-06-10',
    readTime: '6 min read',
    category: 'Strategy',
    sections: [
      {
        body: 'We just shipped backtesting in DCAlog. You can now take any buying rule set, run it against years of real historical prices, and see exactly how it would have performed next to a plain fixed-amount DCA schedule. Naturally, the first thing we did was backtest our own favourite feature: drawdown buying rules. We expected a comfortable win. What we got was a lesson in humility, and honestly, the most useful insight the feature has produced so far.',
      },
      {
        heading: 'The experiment',
        body: 'The setup is simple. Take a rule set like the one we recommend in our ATH drawdown guide: buy 1.5x your normal amount when the price is 20% to 40% below its all-time high, and 2x when it is more than 40% below. Run it on Bitcoin with a weekly schedule over the past few years. The backtest executes every scheduled buy twice, once with the rules applied and once as a plain 1x control, on exactly the same dates and prices. Same asset, same schedule, same discipline. The only difference is the rules.',
      },
      {
        heading: 'The result',
        body: 'Over most date ranges, the two strategies finish almost identical. The rule set usually ends a little ahead, a slightly lower average buy price, a slightly better ROI, but the gap is far smaller than the marketing of "smart DCA" tools would have you believe. If you expected the rules to double your returns, the chart is sobering: two lines hugging each other for years, with the strategy line peeling just barely above the control.',
      },
      {
        heading: 'Why the gap is so small',
        body: 'The math is unglamorous. Most of the time, price sits within 20% of its running all-time high, so your multiplier rules simply never fire. The vast majority of buys execute at 1x on both sides of the comparison. A handful of boosted buys, however well timed, gets diluted across hundreds of ordinary ones. And when the rules do fire, they also invest more total money, so the fair comparison is return percentage, not final dollars. Shifting your average buy price by a few percent over years of accumulation just does not move the endgame much.',
      },
      {
        heading: 'When the rules genuinely win',
        body: 'There is one scenario where the gap stops being subtle: a deep, prolonged bear market inside your window. Run the same backtest across 2021 to 2023, when Bitcoin spent over a year between 50% and 75% below its peak, and the drawdown rules fire week after week, stacking cheap coins the plain schedule never gets. The lesson is not that rules are useless, it is that they are insurance against a specific market condition. In a steady bull market they sit idle. In a crash they quietly do their best work.',
      },
      {
        heading: 'Why we are publishing this anyway',
        body: 'It would have been easy to cherry-pick a 2022 date range, screenshot the winning chart, and call it a day. But DCAlog exists because we believe DCA investors deserve honest tools, and an honest backtest that makes our own feature look modest is worth more than a flattering one. The backtest engine only uses the all-time high that was actually known on each historical date, it tells you when data was missing, and it shows losing results as plainly as winning ones. If a strategy cannot survive an honest test, it does not deserve your money.',
      },
      {
        heading: 'The real takeaway: consistency beats cleverness',
        body: 'Here is what the data actually argues for. The biggest driver of your DCA outcome is not the cleverness of your rules, it is whether you keep buying through the periods when everyone else stops. Drawdown rules earn you a small discount, and perhaps more importantly, they give you a plan for the exact moments when fear is loudest. That psychological edge does not show up in a backtest, but it is the difference between investors who accumulate through a bear market and investors who watch one. The rules will not make you rich on their own. They will help you stay systematic, and staying systematic is what works.',
      },
      {
        heading: 'Run your own backtest',
        body: 'Do not take our word for any of this. Open Rule sets in DCAlog, click the flask icon on any buying rule set, pick an asset and a date range, and see the comparison for yourself. Try a bull-market window, then try one that includes a crash. Look at the average buy price row, that is where a strategy shows its edge first. Whatever the result says, you will know something true about your strategy, and that is the entire point.',
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}
