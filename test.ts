async chartData(payload: any, res: Response) {
  try {
    const { productId, type } = payload
    const getDate = new Date();

    let date = getDate.getFullYear() + '-' +
      String(getDate.getMonth() + 1).padStart(2, '0') + '-' +
      String(getDate.getDate()).padStart(2, '0') + ' ' + "00" + '-' + "00" + '-' + "00"
    // String(getDate.getHours()).padStart(2, '0') + '-' +
    // String(getDate.getMinutes()).padStart(2, '0') + '-' +
    // String(getDate.getSeconds()).padStart(2, '0');

    if (type == 0 || type == 1 || type == 2) {
      date = getDate.getFullYear() + '-' +
        String(getDate.getMonth() + 1).padStart(2, '0') + '-' + '01' + ' ' + "00" + '-' + "00" + '-' + "00"
    }

    console.log(date); // Outputs in the format: YYYY-MM-DD HH-mm-ss
    const formattedDate = date.substring(0, 7);
    console.log(formattedDate, "formattedDate");
    const formattedYear = date.substring(0, 4);
    console.log(formattedYear, "formattedYear");
    const year = parseInt(formattedDate.substring(0, 4));
    const previousYear = year - 1; // Calculate the previous year
    // let getData: any[] = []

    const currentDate = new Date();
    const currentFormattedDate = currentDate.toISOString().substring(0, 7); // 'YYYY-MM'
    console.log(currentFormattedDate, "currentFormattedDate");

    let resultDate;
    // if (formattedDate > currentFormattedDate) {
    //   return commonController.errorMessage("Date is greater than current date", res)

    // }

    // if (formattedDate === currentFormattedDate) {
    //   // If the date matches the current month, get today's date in 'YYYY-MM-DD' format
    //   // resultDate =  `CURRENT_DAY('${currentDate.toISOString().substring(0, 10)}'`;
    //   resultDate = `CURDATE()`
    // } else {
    //   // Otherwise, use the formatted date ('YYYY-MM')

    // }
    resultDate = `LAST_DAY('${date}')`;

    console.log(resultDate, "resultDate");

    if (type == 0) {
      const query = `WITH RECURSIVE DateSeries AS (
      SELECT '${date}' AS month_year
      UNION ALL
      SELECT DATE_ADD(month_year, INTERVAL 1 DAY)
      FROM DateSeries
      WHERE month_year < ${resultDate}
  )
  SELECT 
      ds.month_year, 
      COALESCE(st.amount, (
          SELECT amount
          FROM sell_trades 
          WHERE DATE(createdAt) <= ds.month_year
            AND product_id = ${productId}
            AND active = 1 or active = 3
          ORDER BY DATE(createdAt) DESC 
          LIMIT 1
      )) AS amount
  FROM 
      DateSeries ds
  LEFT JOIN (
      SELECT 
          DATE(createdAt) AS month_year, 
          MAX(amount) AS amount
      FROM 
          sell_trades
      WHERE 
          product_id = ${productId} 
          AND active = 1 or active = 3
          AND DATE_FORMAT(createdAt, '%Y-%m') = '${formattedDate}'
      GROUP BY 
          DATE(createdAt)
  ) st ON ds.month_year = st.month_year
  ORDER BY ds.month_year;`

      console.log(query, "query");
      const getData = await MyQuery.query(query, { type: QueryTypes.SELECT })
      console.log(getData);
      commonController.successMessage(getData, "Chart Data ", res)
    }

    if (type == 1) {
      const getData = await MyQuery.query(`SELECT 
      DATE_FORMAT(createdAt, '%Y-%m') AS month_year,
      MAX(amount) AS amount
  FROM sell_trades
  WHERE active = 1 or active = 3 
    AND product_id = ${productId} 
    AND YEAR(createdAt) = '${formattedYear}'
  GROUP BY month_year
  ORDER BY month_year;
  `, { type: QueryTypes.SELECT });
      console.log(getData);

      let months: any[]

      if (formattedDate === currentFormattedDate) {
        months = [`${formattedYear}-01`, `${formattedYear}-02`, `${formattedYear}-03`, `${formattedYear}-04`, `${formattedYear}-05`, `${formattedYear}-06`, `${formattedYear}-07`, `${formattedYear}-08`, `${formattedYear}-09`, `${formattedYear}-10`, `${formattedYear}-11`, `${formattedYear}-12`]
        const found = months.find((element) => element === currentFormattedDate);
        const checkIndex = months.indexOf(found)
        months = months.slice(0, checkIndex + 1)
        // const newMonths = months.some(currentFormattedDate)
      } else {
        months = [`${formattedYear}-01`, `${formattedYear}-02`, `${formattedYear}-03`, `${formattedYear}-04`, `${formattedYear}-05`, `${formattedYear}-06`, `${formattedYear}-07`, `${formattedYear}-08`, `${formattedYear}-09`, `${formattedYear}-10`, `${formattedYear}-11`, `${formattedYear}-12`]
      }


      const arr: any[] = []

      // to check amount of previous year last month

      const checkAmount = await MyQuery.query(`SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') AS month_year,
        MAX(amount) AS amount
    FROM sell_trades
    WHERE active = 1 or active = 3 
      AND product_id = ${productId} 
      AND YEAR(createdAt) = '${previousYear}'
    GROUP BY month_year
    ORDER BY month_year;
    `, { type: QueryTypes.SELECT });
      let previousAmo = 0
      if (checkAmount.length > 0) {
        const lastElement = checkAmount[checkAmount.length - 1];
        console.log(lastElement, "lastElement");
        previousAmo = lastElement.amount
      }

      // Loop through all the months in the 'months' array
      months.forEach((month) => {
        // Find if this month exists in the 'getData'
        const match = getData.find((item: any) => item.month_year === month);

        if (match) {
          console.log(`${month} ---> exists in getData`);
          arr.push({ month_year: match.month_year, amount: match.amount });
        } else {
          // If no data is found for this month, use the last known amount or some default value
          const lastKnownAmount = arr.length > 0 ? arr[arr.length - 1].amount : previousAmo; // Assuming 0 if no previous data
          console.log(`${month} ---> does not exist in getData, using last known amount: ${lastKnownAmount}`);
          arr.push({ month_year: month, amount: lastKnownAmount });
        }
      });

      console.log(arr, "newDAta");


      commonController.successMessage(arr, "Chart Data ", res)
    }

    if (type == 3) {
      const getData = await MyQuery.query(`
        
        WITH RECURSIVE HourSeries AS (
-- Start generating hours from 00:00 (12:00 AM) to 23:59 (11:59 PM)
SELECT '${date} 00:00:00' AS month_year
UNION ALL
SELECT DATE_ADD(month_year, INTERVAL 1 HOUR)
FROM HourSeries
WHERE month_year < '${date} 23:00:00' -- Last hour at 11:00 PM
)

SELECT 
hs.month_year,
COALESCE(st.amount, (
    -- Subquery to fetch the last known amount before this hour if no data exists for the hour
    SELECT amount 
    FROM sell_trades 
    WHERE DATE(createdAt) <= '${date}'
      AND createdAt <= hs.month_year
      AND product_id = ${productId}
      AND active = 1 or active = 3 
    ORDER BY createdAt DESC
    LIMIT 1
)) AS amount
FROM 
HourSeries hs
LEFT JOIN (
SELECT 
  DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') AS month_year, 
  MAX(amount) AS amount
FROM 
  sell_trades
WHERE 
  product_id = ${productId} 
  AND active = 1 or active = 3 
  AND DATE(createdAt) = '${date}' -- Filter by the specific date
GROUP BY 
  month_year
) st 
ON hs.month_year = st.month_year
ORDER BY hs.month_year;
      `, { type: QueryTypes.SELECT });

      console.log(getData);
      commonController.successMessage(getData, "Hourly Chart Data ", res);
    }



  } catch (e) {
    console.log(e, "Error");
    commonController.errorMessage(`${e}`, res)

  }
}