const axios = require('axios');

async function test() {
  try {
    console.log('=== 1. 登录 ===');
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'emp01',
      password: '123456'
    });
    console.log('用户:', loginRes.data.user.name);
    const token = loginRes.data.token;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    console.log('\n=== 2. 获取办公地点列表 ===');
    const officeRes = await axios.get('http://localhost:3001/api/office-locations', config);
    officeRes.data.forEach(o => 
      console.log(`  ${o.id}. ${o.name} - ${o.address} (${o.lat}, ${o.lng}) 半径:${o.radius}米`)
    );

    console.log('\n=== 3. 测试: 正常位置打卡 ===');
    const checkInRes = await axios.post('http://localhost:3001/api/attendance/check-in', {
      location: '测试位置',
      lat: 39.9042,
      lng: 116.4074
    }, config);
    console.log('  状态:', checkInRes.data.status);
    console.log('  位置异常:', checkInRes.data.is_location_anomaly);
    console.log('  异常状态:', checkInRes.data.anomaly_status);
    console.log('  异常原因:', checkInRes.data.anomaly_reason);

    console.log('\n=== 4. 测试: 超出范围打卡 ===');
    const checkOutRes = await axios.post('http://localhost:3001/api/attendance/check-out', {
      location: '很远的地方',
      lat: 40.0,
      lng: 117.0
    }, config);
    console.log('  状态:', checkOutRes.data.status);
    console.log('  位置异常:', checkOutRes.data.is_location_anomaly);
    console.log('  异常状态:', checkOutRes.data.anomaly_status);
    console.log('  异常原因:', checkOutRes.data.anomaly_reason);

    console.log('\n=== 5. 测试: 管理员获取异常列表 ===');
    const adminLogin = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const adminConfig = { headers: { Authorization: `Bearer ${adminLogin.data.token}` } };
    const anomalyRes = await axios.get('http://localhost:3001/api/attendance/anomalies?status=pending', adminConfig);
    console.log('待审核异常数量:', anomalyRes.data.length);
    anomalyRes.data.forEach(a => 
      console.log(`  ${a.date} ${a.user_name} - ${a.anomaly_reason}`)
    );

    console.log('\n=== 6. 测试: 审核异常 ===');
    if (anomalyRes.data.length > 0) {
      const firstAnomaly = anomalyRes.data[0];
      const reviewRes = await axios.put(`http://localhost:3001/api/attendance/${firstAnomaly.id}/review-anomaly`, {
        anomaly_status: 'approved',
        review_note: '情况属实，予以通过'
      }, adminConfig);
      console.log('审核结果:');
      console.log('  异常状态:', reviewRes.data.anomaly_status);
    }

    console.log('\n=== 7. 测试: 管理员办公地点管理 ===');
    const adminOffices = await axios.get('http://localhost:3001/api/admin/office-locations', adminConfig);
    console.log('办公地点数量:', adminOffices.data.length);
    
    const newOffice = await axios.post('http://localhost:3001/api/admin/office-locations', {
      name: '测试分公司',
      address: '上海市浦东新区',
      lat: 31.2304,
      lng: 121.4737,
      radius: 200,
      is_active: 1
    }, adminConfig);
    console.log('新增办公地点:', newOffice.data.name);

    await axios.delete(`http://localhost:3001/api/admin/office-locations/${newOffice.data.id}`, adminConfig);
    console.log('删除测试办公地点成功');

    console.log('\n✅ 所有测试通过!');
  } catch (e) {
    console.error('❌ 测试失败:', e.response?.data || e.message);
    process.exit(1);
  }
}

test();
