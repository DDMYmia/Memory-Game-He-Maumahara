
const path = require('path');
const { createSandbox } = require('./test-harness');
const { SimPlayer, PROFILES } = require('./sim-player');

const LEVELS = [
    { name: 'Level 1', file: 'lvl1.js' },
    { name: 'Level 2', file: 'lvl2.js' },
    { name: 'Level 3', file: 'lvl3.js' }
];

async function runSuite() {
    console.log('==================================================');
    console.log('      AUTOMATED PLAYER SIMULATION SUITE');
    console.log('==================================================');
    
    const results = [];

    for (const level of LEVELS) {
        console.log(`\nTesting ${level.name}...`);
        console.log('--------------------------------------------------');
        
        const scriptPath = path.join(__dirname, '../js', level.file);

        for (const profileKey in PROFILES) {
            const profile = PROFILES[profileKey];
            process.stdout.write(`  Running ${profile.name}... `);
            
            try {
                const sandbox = createSandbox(scriptPath);
                const player = new SimPlayer(sandbox, profile);
                
                const result = await player.play();
                
                const flowDisplay = result.flowIndex !== undefined ? result.flowIndex.toFixed(3) : 'N/A';

                if (result.completed) {
                    console.log(`✅ Success | Flow: ${flowDisplay} | Moves: ${result.moves}`);
                } else {
                    console.log(`❌ Failed  | Flow: ${flowDisplay} | Moves: ${result.moves}`);
                }

                results.push({
                    level: level.name,
                    profile: profile.name,
                    success: result.completed,
                    flow: flowDisplay,
                    moves: result.moves
                });

            } catch (err) {
                console.log(`❌ Error: ${err.message}`);
                // console.error(err);
            }
        }
    }

    console.log('\n==================================================');
    console.log('                SUMMARY REPORT');
    console.log('==================================================');
    console.table(results);
}

runSuite();
