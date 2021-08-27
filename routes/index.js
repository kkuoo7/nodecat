const express = require("express"); 
const axios = require("axios"); 
const { token } = require('morgan');
const { renderString } = require('nunjucks');

const router = express.Router(); 
const URL = "http://localhost:8082/v2"; 

axios.defaults.headers.origin = "http://localhost:4000"; 

const request = async (req,api)=>{ // request라는 함수를 선언 
    try {
        if(!req.session.jwt) { // 발급받은 토큰이 없을 시에 
            const tokenResult = await axios.post(`${URL}/token`, { //8082/v2/token
                clientSecret : process.env.CLIENT_SECRET,
            }); 
            // 8082/v2/token 에서 res.json()으로 tokenResult에 code,message,token을 넘겨주었다. 

            // tokenResult.data를 통해 접근이 가능하다. 
            req.session.jwt = tokenResult.data.token; 
            // nodecat 에서 req.session.jwt에 토큰(id,nick)을 할당한다. 
        }

        // header라는 객체를 만들고 그 안에 authrorization을 속성명으로 가지는 객체를 만듬. 
        // req.headers.authorization 을 통해 req.session.jwt 값에 접근이 가능하다. 
        return axios.get(`${URL}${api}`,{ // 8082/v2/api를 호출해서 결과를 반환한다. 
            headers : {authorization : req.session.jwt},
        }); 

    } catch (error) {
        if(error.response.status === 419) { // 토큰 만료시에 
            delete req.session.jwt; 
            return request(req,api);
            // 삭제하고 재발급 받기 
        }

        return error.response; 
    }
};

router.get("/mypost", async (req,res,next)=>{
    try {
        console.log("Hi");
        const result = await request(req,"/posts/my");
        // result에 nodebird-api 서버에서 응답한 res.json()데이터가 들어있다. 
        // 이걸 유의미한 데이터로 쓰기 위해서는 result.data를 하면 객체형태로 사용할 수 있다.
        
        res.json(result.data); // 받은 데이터를 다시 res.json()으로 클라이언트에 전달해서 화면에 보여준다. 
    } catch (error) {
        console.error(error);
        next(error); 
    }
}); 

router.get("/search/:hashtag",async(req,res,next)=>{
    try {
        const result = await request(req,`/posts/hashtag/${encodeURIComponent(req.params.hashtag)}`); 
        // hashtag를 인코딩해서 url로 전달

        res.json(result.data);
    } catch(error) {
        if(error.code) {
            console.error(error);
            next(error); 
        }
    }
})

router.get("/follow",async(req,res)=>{
    try{

        //8082/v2/follow에서 res.json()으로 {code,follower,following} 을 보내준다. 
        const result = await request(req,'/follow'); 
        res.json(result.data);

    } catch (error) {
        console.error(error); 
        next(error);
    }
})

// router.get('/test', async(req,res,next)=> { // 토큰 테스트 라우터 
//     try {
//         console.log("Nodecat, routes/index.js, req.session : ",req.session); 
//         if(!req.session.jwt) { // 세션에 토큰이 없으면 발급을 시도 --> 처음엔 당연히 없다. 
//             const tokenResult = await axios.post("http://localhost:8082/v1/token",{
//                 clientSecret : process.env.CLIENT_SECRET,
//             }); 
//             // totkenResult는 nodebird-api에서 res.json()으로 보내준 데이터
//             // tokenResult.data 를 통해 접근이 가능하다. 

//            // console.log("tokenResult : ",tokenResult); 
//             if(tokenResult.data && tokenResult.data.code === 200) {
//                 req.session.jwt = tokenResult.data.token; //req.session 안에 jwt 토큰을 추가
//             } else {
//                 return res.json(tokenResult.data); // 발급실패시 사유를 응답으로 보내준다.
//             }
            
//             // 발급받은 토큰을 테스트한다. 
//             const result = await axios.get("http://localhost:8082/v1/test",{
//                 headers : {authorization : req.session.jwt},
//             }); 

//             //console.log("routes/index.js result : ",result); // 아마 v1.js에서 보낸 req.decode 일 것이야 
//             return res.json(result.data); // res.json()을 통해서 보낸 데이터는 .data를 통해 접근이 가능하다.
//         }
//     } catch(error) {
//      //  console.log("routes/index.js, error : ",error); 

//         if(error.response.status === 419) { // 토큰 만료시에 
//             return res.json(error.response.data); 
//         }

//         return next(error); 
//     }
// }); 

router.get("/",(req,res)=>{
    res.render("main",{key : process.env.CLIENT_SECRET}); 
});  

module.exports = router; 