export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  title: string;
  /** Groups marked internal only appear on the in-app Help page, not the public /faq page. */
  internal?: boolean;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is DCA and how does DCAlog help?',
        a: 'Dollar-Cost Averaging (DCA) is an investment strategy where you buy a fixed amount of an asset at regular intervals regardless of price. DCAlog lets you track those recurring purchases, monitor your average cost basis, and see your real-time P&L across all your positions in one place.',
      },
      {
        q: 'How do I create a DCA plan?',
        a: 'Go to DCA Plans and click "New plan". Enter the asset (e.g. BTC), your buy frequency, and the amount per purchase. Once saved, you can log individual transactions against that plan and the app will automatically track your cost basis and performance.',
      },
      {
        q: 'Can I change my display currency?',
        a: 'Yes. Go to Settings → Preferences and pick your preferred currency. All portfolio values, P&L figures, and transaction amounts will be converted using live exchange rates.',
      },
    ],
  },
  {
    title: 'Plans & rules',
    items: [
      {
        q: 'What are Buying Rules?',
        a: 'Buying Rules let you define conditions under which you want to buy more. You set a drawdown range (e.g. −10% to −20% from ATH) and the amount to buy. The app checks these rules when you view your plans and notifies you when a rule\'s conditions are met so you never miss a dip.',
      },
      {
        q: 'What are Sell Rules?',
        a: 'Sell Rules work the opposite way: you define a P&L range (e.g. +50% to +100%) and an amount to sell. They help you take profit systematically instead of emotionally. The current P&L percentage is shown next to the Sell Rules panel title so you can see how close you are at a glance.',
      },
      {
        q: 'How is my P&L calculated?',
        a: 'P&L is calculated as ((current price − average cost) / average cost) × 100. Your average cost is the weighted average of all your logged transactions for that asset. Live prices are fetched automatically so the percentage updates in real time.',
      },
      {
        q: 'How do Goals work?',
        a: 'Goals let you set a target value or price for an asset (e.g. "reach $10,000 in BTC"). The app shows your progress toward each goal based on your current holdings and live prices.',
      },
    ],
  },
  {
    title: 'Tools & insights',
    items: [
      {
        q: 'What is the Simulator?',
        a: 'The Simulator lets you backtest a DCA strategy on historical price data without committing real money. You can adjust the start date, frequency, and amount to see what your portfolio would look like today if you had followed that plan.',
      },
      {
        q: 'What does the Projection page show?',
        a: 'Projection estimates the future value of your DCA plan based on a target price or an assumed annual growth rate. It\'s useful for setting realistic expectations and understanding how consistent contributions compound over time.',
      },
      {
        q: 'What does the Tax Report include?',
        a: 'The Tax Report summarises your realised gains and losses from completed sell transactions. It groups them by asset and tax year, giving you a ready-made overview to hand to your accountant or import into a tax tool.',
      },
      {
        q: 'What notifications does DCAlog send?',
        a: 'DCAlog sends in-app notifications for three events: a DCA reminder when a plan\'s next purchase date is tomorrow, a Buying Rule alert when an asset\'s drawdown falls inside a rule\'s range, and a Sell Rule alert when P&L enters a sell rule\'s range. No emails, everything stays inside the app.',
      },
      {
        q: 'How does the Fear & Greed Index work?',
        a: 'The Fear & Greed Index on the Dashboard is fetched from the Alternative.me API. It scores overall crypto market sentiment from 0 (Extreme Fear) to 100 (Extreme Greed). Many DCA investors use it as a signal to increase buys during fear periods.',
      },
    ],
  },
  {
    title: 'Account & data',
    internal: true,
    items: [
      {
        q: 'How do I back up and restore my data?',
        a: 'Go to Settings → Data. You can download a full backup of your plans, transactions, assets, buying rules, and sell rules as a JSON file. To restore, upload that file on the same page. Old backups from before sell rules were added are still compatible.',
      },
      {
        q: 'How do I change my avatar?',
        a: 'Click your avatar in the top-right corner and choose Account, or go to Settings → Account. You can upload your own photo (cropped to a square automatically) or pick from a set of built-in avatar styles. Changes are reflected everywhere in the app immediately.',
      },
      {
        q: 'Is there an admin panel?',
        a: 'Yes, if your account has admin access you\'ll see an Admin link in the sidebar. It shows platform-wide stats (users, plans, transactions), lets you manage user accounts, and gives you a view of all feedback submissions.',
      },
    ],
  },
];

/** Groups shown on the public /faq page (excludes app-internal topics). */
export const PUBLIC_FAQ_GROUPS: FaqGroup[] = FAQ_GROUPS.filter((g) => !g.internal);
