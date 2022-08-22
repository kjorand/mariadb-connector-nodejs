'use strict';

const base = require('../../base.js');
const { assert } = require('chai');
const Long = require('long');

describe('integer with big value', () => {
  before((done) => {
    shareConn
      .query('DROP TABLE IF EXISTS testBigint')
      .then(() => {
        return shareConn.query(
          'CREATE TABLE testBigint (v BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY)'
        );
      })
      .then(() => {
        done();
      })
      .catch(done);
  });

  it('int escape', function (done) {
    const buf = 19925;
    assert.equal(shareConn.escape(buf), '19925');
    const maxValue = Long.fromString('18446744073709551615', true);
    assert.equal(shareConn.escape(maxValue), '18446744073709551615');

    shareConn
      .query(' SELECT ' + shareConn.escape(buf) + ' t')
      .then((rows) => {
        assert.deepEqual(rows, [{ t: buf }]);
        done();
      })
      .catch(done);
  });

  it('decimal value without truncation', async function () {
    await shareConn.query('DROP TABLE IF EXISTS floatTest');

    await shareConn.query('CREATE TABLE floatTest (t DOUBLE, t2 DECIMAL(32,16))');
    await shareConn.query(
      'INSERT INTO floatTest VALUES (-0.9999237060546875, 9999237060546875.9999237060546875)'
    );
    await shareConn.query('START TRANSACTION'); // if MAXSCALE ensure using WRITER
    const rows = await shareConn.query(' SELECT * FROM floatTest');
    assert.deepEqual(rows, [{ t: -0.9999237060546875, t2: 9999237060546875.9999237060546875 }]);
    shareConn.commit();
  });

  it('bigint format', async () => {
    await shareConn.query('START TRANSACTION'); // if MAXSCALE ensure using WRITER
    let rows = await shareConn.query('INSERT INTO testBigint values (127), (128)');
    assert.strictEqual(rows.insertId, 128);
    rows = await shareConn.query(
      'INSERT INTO testBigint values (-9007199254740991), (9007199254740991)'
    );

    assert.strictEqual(rows.insertId, 9007199254740991);
    rows = await shareConn.query('INSERT INTO testBigint values ()');
    assert.strictEqual(rows.insertId, 9007199254740992);
    rows = await shareConn.query('INSERT INTO testBigint values ()');

    assert.strictEqual(rows.insertId, 9007199254740993);
    rows = await shareConn.query('SELECT * FROM testBigint');
    assert.strictEqual(rows.length, 6);
    assert.strictEqual(rows[0].v, -9007199254740991);
    assert.strictEqual(rows[1].v, 127);
    assert.strictEqual(rows[2].v, 128);
    assert.strictEqual(rows[3].v, 9007199254740991);
    assert.strictEqual(rows[4].v, 9007199254740992);
    assert.strictEqual(rows[4].v, 9007199254740993);
    assert.strictEqual(typeof rows[3].v, 'number');
    rows = await shareConn.query({
      supportBigNumbers: true,
      sql: 'SELECT * FROM testBigint'
    });
    assert.strictEqual(rows.length, 6);
    assert.strictEqual(rows[0].v, -9007199254740991);
    assert.strictEqual(rows[1].v, 127);
    assert.strictEqual(rows[2].v, 128);
    assert.strictEqual(rows[3].v, 9007199254740991);
    assert.strictEqual(typeof rows[4].v, 'object');
    assert.strictEqual(rows[4].v.toString(), '9007199254740992');
    assert.strictEqual(rows[5].v.toString(), '9007199254740993');
    rows = await shareConn.query({
      bigNumberStrings: true,
      sql: 'SELECT * FROM testBigint'
    });
    assert.strictEqual(rows.length, 6);
    assert.strictEqual(rows[0].v, -9007199254740991);
    assert.strictEqual(rows[1].v, 127);
    assert.strictEqual(rows[2].v, 128);
    assert.strictEqual(rows[3].v, 9007199254740991);
    assert.strictEqual(rows[4].v, '9007199254740992');
    assert.strictEqual(rows[5].v, '9007199254740993');
    assert.strictEqual(typeof rows[4].v, 'string');
    rows = await shareConn.query({
      supportBigInt: true,
      sql: 'SELECT * FROM testBigint'
    });
    assert.strictEqual(rows.length, 6);
    assert.strictEqual(rows[0].v, BigInt(-9007199254740991));
    assert.strictEqual(rows[1].v, BigInt(127));
    assert.strictEqual(rows[2].v, BigInt(128));
    assert.strictEqual(rows[3].v, BigInt(9007199254740991));
    assert.strictEqual(rows[4].v, BigInt('9007199254740992'));
    assert.strictEqual(rows[5].v, BigInt('9007199254740993'));
    assert.strictEqual(typeof rows[4].v, 'bigint');
    shareConn.commit();

    const conn2 = await base.createConnection({ supportBigInt: true });
    rows = await conn2.query('INSERT INTO testBigint values ()');
    assert.strictEqual(rows.insertId, BigInt('9007199254740994'));
    conn2.end();
  });

  it('bigint format null ', async () => {
    await shareConn.query('DROP TABLE IF EXISTS testBigintNull');
    await shareConn.query('CREATE TABLE testBigintNull (v BIGINT)');
    await shareConn.query('START TRANSACTION'); // if MAXSCALE ensure using WRITER
    await shareConn.query('INSERT INTO testBigintNull values (127), (null)');
    let rows = await shareConn.query('SELECT * FROM testBigintNull');
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].v, 127);
    assert.strictEqual(rows[1].v, null);
    rows = await shareConn.query({ supportBigNumbers: true, sql: 'SELECT * FROM testBigintNull' });
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].v, 127);
    assert.strictEqual(rows[1].v, null);
    rows = await shareConn.query({ bigNumberStrings: true, sql: 'SELECT * FROM testBigintNull' });
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].v, 127);
    assert.strictEqual(rows[1].v, null);
    rows = await shareConn.query({ supportBigInt: true, sql: 'SELECT * FROM testBigintNull' });
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].v, BigInt(127));
    assert.strictEqual(rows[1].v, null);
    shareConn.commit();
  });

  it('numeric fields conversion to int', async () => {
    await shareConn.query('DROP TABLE IF EXISTS intAllField');
    await shareConn.query(
      'CREATE TABLE intAllField (' +
        't1 TINYINT(1), t2 SMALLINT(1), t3 MEDIUMINT(1), t4 INT(1), t5 BIGINT(1), t6 DECIMAL(1), t7 FLOAT, t8 DOUBLE)'
    );
    await shareConn.query('START TRANSACTION'); // if MAXSCALE ensure using WRITER
    await shareConn.query(
      'INSERT INTO intAllField VALUES (null, null, null, null, null, null, null, null)'
    );
    await shareConn.query('INSERT INTO intAllField VALUES (0, 0, 0, 0, 0, 0, 0, 0)');
    await shareConn.query('INSERT INTO intAllField VALUES (1, 1, 1, 1, 1, 1, 1, 1)');
    await shareConn.query('INSERT INTO intAllField VALUES (2, 2, 2, 2, 2, 2, 2, 2)');
    const res = await shareConn.query('SELECT * FROM intAllField');
    assert.deepEqual(res, [
      {
        t1: null,
        t2: null,
        t3: null,
        t4: null,
        t5: null,
        t6: null,
        t7: null,
        t8: null
      },
      { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, t6: 0, t7: 0, t8: 0 },
      { t1: 1, t2: 1, t3: 1, t4: 1, t5: 1, t6: 1, t7: 1, t8: 1 },
      { t1: 2, t2: 2, t3: 2, t4: 2, t5: 2, t6: 2, t7: 2, t8: 2 }
    ]);
    shareConn.commit();
  });

  it('using very big number', async function () {
    const maxValue = Long.fromString('18446744073709551615', true);
    const conn = await base.createConnection({ supportBigNumbers: true });
    await conn.query('DROP TABLE IF EXISTS BIG_NUMBER');
    await conn.query('CREATE TABLE BIG_NUMBER (val BIGINT unsigned)');
    await conn.query('START TRANSACTION'); // if MAXSCALE ensure using WRITER
    await conn.query('INSERT INTO BIG_NUMBER values (?), (?)', [10, maxValue]);
    const res = await conn.query('SELECT * FROM BIG_NUMBER LIMIT ?', [maxValue]);
    assert.deepEqual(res, [{ val: 10 }, { val: maxValue }]);
    conn.commit();
    conn.end();
  });

  it('using very big number bigint', async function () {
    const maxValue = BigInt('18446744073709551615');
    const conn = await base.createConnection({ supportBigInt: true });
    await conn.query('DROP TABLE IF EXISTS BIG_NUMBER');

    await conn.query('CREATE TABLE BIG_NUMBER (val BIGINT unsigned)');
    await conn.query('START TRANSACTION'); // if MAXSCALE ensure using WRITER
    await conn.query('INSERT INTO BIG_NUMBER values (?), (?)', [10, maxValue]);
    const res = await conn.query('SELECT * FROM BIG_NUMBER LIMIT ?', [maxValue]);
    assert.deepEqual(res, [{ val: BigInt(10) }, { val: maxValue }]);
    conn.commit();
    conn.end();
  });
});
