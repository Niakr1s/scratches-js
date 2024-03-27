function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function job (i) {
  console.log(`${i} start`);
  await delay(200);
  if (i < 5) {
    console.log(`${i} done`);
    return i;
  } else {
    throw new Error(`${i} err`);
  }
}

async function repeat (fn, n, token = { cancelled: false }) {
  if (n === 0) { throw new Error('max retries reached'); }
  if (token.cancelled) { throw new Error('cancelled'); }
  try {
    return await fn();
  } catch (err) {
    return repeat(fn, n - 1, token);
  }
}

class Pool {
  constructor (max) {
    this.max = max;
    this.pending = [];
    this.next = 0;
    this.running = 0;
  }

  add (fn) {
    this.pending.push(fn);
  }

  run () {
    return new Promise(resolve => {
      if (this.pending.length === 0) {
        return;
      }

      const results = new Array(this.pending.length);

      const done = (i, res, err) => {
        results[i] = { res, err };
        this.running--;
        if (this.running === 0) {
          resolve(results);
        } else {
          this.runNext(done);
        }
      };

      for (let i = 0; i < this.max; i++) {
        this.runNext(done);
      }
    });
  }

  runNext (done) {
    const fn = this.pending.shift();
    if (!fn) { return; }

    this.running++;
    const i = this.next++;

    fn()
      .then((res, err) => done(i, res, err))
      .catch(err => done(i, undefined, err));
  }
}

async function main () {
  const pool = new Pool(3);
  const token = { cancelled: false };
  for (let i = 0; i < 10; i++) {
    const j = () => repeat(() => job(i), 3, token);
    pool.add(j);
  }
  delay(1000).then(() => { token.cancelled = true; });
  const results = await pool.run();
  console.log(results);
  console.log('done');
}

(async function () {
  await main();
})();
