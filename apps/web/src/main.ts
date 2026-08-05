import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const currency = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyPattern = /₡(-?\d+(?:\.\d+)?)(?![\d,.])/g;

function formatDisplayedAmounts(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as Text;
    const formatted = text.data.replace(moneyPattern, (_match, value: string) => `₡${currency.format(Number(value))}`);
    if (formatted !== text.data) text.data = formatted;
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script, style, input, textarea')) continue;
    const formatted = node.data.replace(moneyPattern, (_match, value: string) => `₡${currency.format(Number(value))}`);
    if (formatted !== node.data) node.data = formatted;
  }
}

bootstrapApplication(AppComponent, appConfig).catch((error: unknown) => {
  console.error(error);
});

const observer = new MutationObserver((changes) => {
  for (const change of changes) {
    if (change.type === 'characterData') formatDisplayedAmounts(change.target);
    else for (const node of change.addedNodes) formatDisplayedAmounts(node);
  }
});
observer.observe(document.body, { childList: true, characterData: true, subtree: true });
formatDisplayedAmounts(document.body);
