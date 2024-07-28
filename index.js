import express from "express";
import axios, { all } from "axios";
import bodyParser from "body-parser";


const app = express();
const port = 3000;
const API_URL = "https://api.discogs.com";
const token = "CacyHqxJteziaeyZtaHEqmBYNGzHyKEANogRkbme"

// MW
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// homepage
app.get("/", (req,res) => {
  res.render("index.ejs");
});

// make search request with artist name! 
app.post("/search", async (req,res) => {
  const allReleases = [];
  const artist = req.body.artist;
  
  try {
    // make request to artist releases page 1 with num results per page as 100, extract num of total pages
    const response = await axios.get(`${API_URL}/database/search?artist=${artist}&token=${token}&page=1&per_page=100`,{
      params : {
        artist: artist,
        token : token,
      }
    })
    // check if page 1 has 0 results - this means no artist found
    var responseResults = response.data.results.length;
    if (responseResults===0) {
      var noResults = true;
      // handle no results for artist.....
      console.log(`no data was found for ${artist}`);
      res.render("index.ejs",{
        artist : artist,
        noResults : noResults
      });

    } else {

      // get num pages for artist
      var numPages = response.data.pagination.pages;
      console.log(`${numPages} pages for ${artist} with 100 results per page`);
      
      // if numPages is greater than 10 let's make it 10 pages to search through as max
      if (numPages>10) {
        console.log("since this artist has more than 10 pages we will limit search to first 10 pages");
        numPages = 10
      }

      for (let i=1;i<=numPages;i++) {
        let arrCurPage = {
          "title" : [],
          "wants" : [],
          "uri" : []
        };

        const pageResponse = await axios.get(`${API_URL}/database/search?artist=${artist}&token=${token}&page=${i}&per_page=100`)
        const numPageResults = pageResponse.data.results.length;
        console.log(`page # ${i} number results ${numPageResults}`);

        for (let x=0;x<numPageResults;x++) {
          const curTitle = pageResponse.data.results[x].title;
          const wantCount = pageResponse.data.results[x].community.want;
          const curURI = pageResponse.data.results[x].uri;
          // add to current page array
          arrCurPage.title[x] = curTitle;
          arrCurPage.wants[x] = wantCount;
          arrCurPage.uri[x] = curURI;
        }
        allReleases.push(arrCurPage);
      }
      // object to hold all titles/releases/uris held in allReleases
      var allTitles = {
        "title" : [],
        "wants" : [], 
        "uri" : []
      };

      // continue adding to allTitles at current length
      for (let q=0;q<allReleases.length;q++) {
        let curPage=allReleases[q];
        for (let y=0;y<curPage.title.length;y++) {
          let myTitle = curPage.title[y];
          let myWants = curPage.wants[y];
          let myURI = curPage.uri[y];
          // try checking for master releases only? URI has either "release" or "master"
          // grabbing only masters will help ensure we aren't showing duplicates in top 10
          if (JSON.stringify(myURI).includes("release")) {
            continue
          }
          allTitles.title[allTitles.title.length] = myTitle;
          allTitles.wants[allTitles.wants.length] = myWants;
          allTitles.uri[allTitles.uri.length] = myURI;
        };
      };

      
      // handle bubble sort of allTitles object
      for (let i=0;i<allTitles.title.length;i++) {
        for (let j=0;j<(allTitles.title.length-i-1);j++) {
          // check if current item is greater than the next item, if so perform swap
          if (allTitles.wants[j]>allTitles.wants[j+1]) {
            var tempTitle = allTitles.title[j];
            var tempWants = allTitles.wants[j];
            var tempURI = allTitles.uri[j];
            allTitles.title[j] = allTitles.title[j+1];
            allTitles.wants[j] = allTitles.wants[j+1];
            allTitles.uri[j] = allTitles.uri[j+1];
            allTitles.title[j+1] = tempTitle;
            allTitles.wants[j+1] = tempWants;
            allTitles.uri[j+1] = tempURI
          }
        }
      }

      // printing all results in sorted order
      for (let b=0;b<allTitles.title.length;b++) {
        console.log(`current title: ${allTitles.title[b]} --- current wants: ${allTitles.wants[b]} --- current index ${b} -- current URL ${allTitles.uri[b]}\n`);
      };

      // extract top 10 most wanted of array
      var topTen = {
        "title" : [],
        "wants" : [],
        "uri" : []
      };

      var endCounter = allTitles.title.length-1;
      for (let n=0;n<allTitles.title.length;n++) {


        topTen.title[n] = allTitles.title[endCounter];
        topTen.wants[n] = allTitles.wants[endCounter];
        topTen.uri[n] = allTitles.uri[endCounter];

        // exit loop if there is not 10 items to display
        if (allTitles.title[n+1]===undefined) {
          break
        }
        if (topTen.title.length===10) {
          break
        }
        
        // // if the current URI we added equals the next URI we're about to add,
        // // then skip over the next URI by subtract an additional index spot
        // // if theyr'e different just decrement the endoucnter by 1 like normal
        // if (topTen.uri[n]===allTitles.uri[endCounter--]) {
        //   endCounter = endCounter-2;
        // } else {
        //   endCounter--;
        // }
        endCounter--
      };
      console.log(topTen);
      
      // send top 10 to ejs page
      res.render("index.ejs",{
        topTenTitles : topTen.title,
        topTenWants : topTen.wants,
        topTenURIs : topTen.uri,
        artist : artist
      });
    }
  } catch (error) {
    console.error(error);
    res.render("index.ejs", {
      errorMsg: error.response.data
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});