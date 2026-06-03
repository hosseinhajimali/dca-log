import { Router } from 'express';
import {
  getBuyingRuleSets, createBuyingRuleSet, updateBuyingRuleSet, deleteBuyingRuleSet,
  getSellRuleSets,   createSellRuleSet,   updateSellRuleSet,   deleteSellRuleSet,
  assignBuyingRuleSet, unassignBuyingRuleSet,
  assignSellRuleSet,   unassignSellRuleSet,
} from '../controllers/ruleSetController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Buying rule sets - CRUD
router.get('/buying',       getBuyingRuleSets);
router.post('/buying',      createBuyingRuleSet);
router.patch('/buying/:id', updateBuyingRuleSet);
router.delete('/buying/:id', deleteBuyingRuleSet);

// Sell rule sets - CRUD
router.get('/selling',        getSellRuleSets);
router.post('/selling',       createSellRuleSet);
router.patch('/selling/:id',  updateSellRuleSet);
router.delete('/selling/:id', deleteSellRuleSet);

// Plan assignments
router.post('/buying/assign/:planId',              assignBuyingRuleSet);
router.delete('/buying/assign/:planId/:ruleSetId', unassignBuyingRuleSet);
router.post('/selling/assign/:planId',             assignSellRuleSet);
router.delete('/selling/assign/:planId/:ruleSetId', unassignSellRuleSet);

export default router;
