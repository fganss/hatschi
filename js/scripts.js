async function main() {
  const db = new Dexie("symptoms_database");
  db.version(1).stores({
    symptoms: 'timestamp,symptom'
  });

  // Loads the model and starts the prediction.
  async function predict() {
    const recognizer = speechCommands.create('BROWSER_FFT');
    await recognizer.ensureModelLoaded();
    document.querySelector('#status').className = 'listening';

    // Array of words that the recognizer is trained to recognize.
    const symptoms = recognizer.wordLabels();
    recognizer.listen(({scores}) => {
      // Turn scores into a list of (score,word) pairs.
      scores = Array.from(scores).map((s, i) => ({score: s, word: symptoms[i]}));
      // Find the most probable word.
      scores.sort((s1, s2) => s2.score - s1.score);

      if(scores[0].word == "three") {
        symptomDetected("cough")
      }
    }, {probabilityThreshold: 0.75});
  }

  // Callback called everytime a symptom is detected.
  async function symptomDetected(symptom) {
    await db.symptoms.add({
      timestamp: +moment(),
      symptom: symptom,
    })

    redraw()
  }

  const chart = document.getElementById('chart');
  var myChart = new Chart(chart, {
    type: 'line',
    data: {
      datasets:[{
        label: 'Coughs',
        data: [],
        fill: false,
        borderColor: '#E0FCFF',
        pointBackgroundColor: '#85BAC0',
        pointBorderColor: '#85BAC0',
        pointRadius: 10,
        borderWidth: 7,
      }]
    },
    options: {
      legend: {display: false},
      scales: {
        xAxes: [{
          gridLines: {
            color: '#91837A',
            lineWidth: 2,
            drawBorder: false,
            zeroLineWidth: 0,
            fontColor: '#fff',
          },
          ticks: {
            fontColor: '#fff',
            fontSize: 24,
            padding: 30,
          },
          type: 'time',
          time: {
            unit: 'day',
          }
        }],
        yAxes: [{
          gridLines: {
            color: '#91837A',
            lineWidth: 2,
            drawBorder: false,
            zeroLineWidth: 0,
          },
          ticks: {
            precision: 0,
            stepSize: 10,
            max: 80,
            fontColor: '#fff',
            fontSize: 16,
            padding: 30,
          },
        }]
      }
    }
  });

  // To be called everytime an event happened.
  async function redraw() {
    const bounds = lastNDays(7)

    const data = []
    for(const i in bounds) {
      [start, end] = bounds[i]
      const coughs = await db.symptoms.where('timestamp').between(+start, +end).count()
      data.push({x: start.toDate(), y: coughs})
    }

    myChart.data.datasets[0].data = data
    myChart.update();
  }

  // Call redraw() to draw the initial state from the database.
  redraw()

  predict();
}

main();