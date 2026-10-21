const major = Number.parseInt(process.versions.node, 10);
if (!Number.isFinite(major) || major < 22) {
  console.error(
    `plainden needs Node.js 22 or newer. This process is ${process.version}. postinstall runs with --experimental-strip-types, which older Node cannot.`,
  );
  process.exit(1);
}
