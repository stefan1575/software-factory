import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { App } from '../src/App.tsx';
import { SAMPLES } from '../src/samples.ts';

afterEach(cleanup);

function open(name = 'Corner Shop') {
  const { container } = render(<App projects={SAMPLES} />);
  if (name !== 'Corner Shop') {
    fireEvent.click(screen.getByRole('button', { name: 'Project: Corner Shop' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
  }
  return container;
}

const sidebar = () => within(screen.getByRole('navigation', { name: 'Efforts' }));
const main = () => within(screen.getByRole('main'));

test('opens on the first open effort, with its tickets and pull requests', () => {
  open();
  expect(main().getByRole('heading', { level: 1 }).textContent).toBe('Sign-in by email');
  expect(main().getByText('Accept the link and start a session')).toBeDefined();
  expect(main().getByText('Pull request #60')).toBeDefined();
});

test('a nested effort opens from the page it sits under', () => {
  open();
  fireEvent.click(main().getByRole('button', { name: /Sessions across devices/ }));
  expect(main().getByRole('heading', { level: 1 }).textContent).toBe('Sessions across devices');
});

test('closed efforts show only when switched on, and hiding one leaves its page', () => {
  open();
  expect(sidebar().queryByText('Product pages')).toBeNull();
  fireEvent.click(screen.getByRole('switch', { name: 'Closed efforts' }));
  fireEvent.click(sidebar().getByText('Product pages'));
  expect(main().getByText('Closed as done')).toBeDefined();
  fireEvent.click(screen.getByRole('switch', { name: 'Closed efforts' }));
  expect(main().getByRole('heading', { level: 1 }).textContent).toBe('Sign-in by email');
});

test('unplaced pull requests and tickets with no effort each have a page', () => {
  open();
  fireEvent.click(sidebar().getByText('Unplaced'));
  expect(main().getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Pull request #62', 'Pull request #63']);
  fireEvent.click(sidebar().getByText('No effort'));
  expect(main().getByText('Fix the footer link')).toBeDefined();
});

test('an effort with no tickets left says so, and an empty project is not an error', () => {
  open('Bakery');
  expect(sidebar().getByText('None left')).toBeDefined();
  cleanup();
  open('New Idea');
  expect(sidebar().getByText('None open')).toBeDefined();
  expect(main().getByText('No tickets here')).toBeDefined();
});

test.each(SAMPLES.map(({ name }) => name))('%s has no accessibility faults', async (name) => {
  const { violations } = await axe.run(open(name), { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  expect(violations.map(({ id, help }) => `${id}: ${help}`)).toEqual([]);
});
